// Standalone Stockfish WASM wrapper — analysis-only, deliberately smaller
// than chess-mvp core's src/engine/stockfishWorker.js. This module never
// plays a game (no getBestMove/setDifficulty/Skill Level knobs needed),
// it only reviews a finished one, so it only needs one capability: score
// a position at a fixed depth.

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

  /**
   * Parses the last `info ... score cp X` / `score mate Y` line seen
   * before `bestmove` arrives — the engine's final evaluation at the
   * deepest completed depth, from the side-to-move's own perspective per
   * UCI convention. Callers normalize this to a single consistent frame
   * (see ../lib/gameAnalysis.js) since UCI's perspective flips every ply.
   *
   * Mate scores convert to a large, move-distance-sensitive centipawn
   * value (10000 minus 10 per ply to mate) so "mate in 1" still ranks
   * above "mate in 8" when sorting swings, rather than collapsing every
   * forced mate to the same number.
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
