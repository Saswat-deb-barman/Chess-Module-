// Wraps Stockfish's UCI text protocol behind a small Promise-based API so
// the rest of the app never has to think about "postMessage" or engine
// startup handshakes.
//
// Difficulty is controlled two ways at once, deliberately:
//  - Skill Level (0-20): Stockfish's own knob for weakening move CHOICE,
//    not just search depth. This is what makes "Easy" occasionally miss
//    a good move like a beginner would, rather than just seeing less far.
//  - Depth cap: bounds how far it searches even when it picks a good line.
// Combining both keeps "Easy" from occasionally finding a genius move by
// accident, which a depth-only cap can still do.
const DIFFICULTY_PRESETS = {
  easy: { skillLevel: 4, depth: 5 },
  medium: { skillLevel: 9, depth: 8 },
  hard: { skillLevel: 16, depth: 12 },
};

export class Engine {
  constructor() {
    this.worker = new Worker("/engine/stockfish-nnue-16-single.js");
    this.ready = new Promise((resolve) => {
      const onReady = (e) => {
        if (e.data === "readyok" || e.data?.includes?.("uciok")) {
          this.worker.removeEventListener("message", onReady);
          resolve();
        }
      };
      this.worker.addEventListener("message", onReady);
      this.worker.postMessage("uci");
    });
  }

  setDifficulty(level) {
    const preset = DIFFICULTY_PRESETS[level] ?? DIFFICULTY_PRESETS.medium;
    this.worker.postMessage(`setoption name Skill Level value ${preset.skillLevel}`);
    this._depth = preset.depth;
  }

  /**
   * Returns the best move for the given FEN as a UCI string like "e2e4"
   * (or "e7e8q" for a promotion). Caller is responsible for splitting
   * this into {from, to, promotion} for chess.js.
   */
  async getBestMove(fen) {
    await this.ready;
    return new Promise((resolve) => {
      const onMessage = (e) => {
        const line = typeof e.data === "string" ? e.data : "";
        if (line.startsWith("bestmove")) {
          this.worker.removeEventListener("message", onMessage);
          resolve(line.split(" ")[1]);
        }
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${this._depth ?? 8}`);
    });
  }

  destroy() {
    this.worker.terminate();
  }
}

export function parseUciMove(uci) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : "q",
  };
}
