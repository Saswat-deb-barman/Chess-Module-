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

  /**
   * Post-game analysis eval, deliberately separate from getBestMove/play
   * strength. Skill Level (set by setDifficulty) only weakens which move
   * the engine CHOOSES during play — it doesn't touch how accurately it
   * SCORES a position, so no strength reset is needed here. This always
   * searches at its own fixed `depth` (independent of the difficulty's
   * play-depth cap) so "defining move" detection is judged by the same
   * objective yardstick regardless of what difficulty was played against.
   *
   * Parses the last `info ... score cp X` / `score mate Y` line seen
   * before `bestmove` arrives — that's the engine's final evaluation at
   * the deepest completed depth, always from the side-to-move's own
   * perspective per UCI convention. Callers normalize this to a single
   * consistent (White's-perspective) sign — see gameAnalysis.js.
   *
   * Mate scores are converted to a large but move-distance-sensitive
   * centipawn value (10000 minus 10 per ply to mate) so "mate in 1" still
   * ranks above "mate in 8" when sorting swings, rather than collapsing
   * every forced mate to the same number.
   */
  async analyzePosition(fen, { depth = 12 } = {}) {
    await this.ready;
    return new Promise((resolve) => {
      let lastScore = null;
      const onMessage = (e) => {
        const line = typeof e.data === "string" ? e.data : "";
        const mateMatch = line.match(/score mate (-?\d+)/);
        const cpMatch = line.match(/score cp (-?\d+)/);
        if (mateMatch) {
          const mateIn = parseInt(mateMatch[1], 10);
          const sign = mateIn > 0 ? 1 : -1;
          lastScore = { mate: mateIn, evalCp: sign * (10000 - 10 * Math.abs(mateIn)) };
        } else if (cpMatch) {
          lastScore = { mate: null, evalCp: parseInt(cpMatch[1], 10) };
        }
        if (line.startsWith("bestmove")) {
          this.worker.removeEventListener("message", onMessage);
          resolve({
            evalCp: lastScore?.evalCp ?? 0,
            mate: lastScore?.mate ?? null,
            bestMove: line.split(" ")[1],
          });
        }
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
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
