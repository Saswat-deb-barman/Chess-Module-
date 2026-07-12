import { Chess } from "chess.js";

/**
 * Post-game "defining move" detector — the quantitative half of this
 * module (see server/council.js's getCouncilReport for the qualitative
 * half, where the 5 coach personas narrate what this finds).
 *
 * Replays a finished PGN one ply at a time and scores each resulting
 * position with the already-loaded engine at a fixed analysis depth.
 * Every move gets classified by how much the evaluation swung in the
 * mover's own favor/disfavor versus the position they were handed, which
 * is what both the move timeline and the council's per-move captions are
 * built from.
 *
 * Engine evals are normalized to White's perspective (positive = good for
 * White) throughout, since that's the one consistent frame across plies
 * regardless of whose move it was. Swing is then re-derived from the
 * mover's own perspective at the moment of comparison.
 */

export const BLUNDER = "blunder";
export const MISTAKE = "mistake";
export const INACCURACY = "inaccuracy";
export const EXCELLENT = "excellent";
export const NORMAL = "normal";

// Centipawn-loss thresholds for the mover's own perspective. A large
// negative swing means the mover's own move made their position worse
// than it already was (a real error, not just "opponent had blundered
// earlier"). A large positive swing usually means either capitalizing
// cleanly on an opponent's prior mistake or finding an only-move save —
// both worth flagging as a defining moment even though only one of those
// is "their own brilliance."
function classify(swing) {
  if (swing <= -300) return BLUNDER;
  if (swing <= -150) return MISTAKE;
  if (swing <= -75) return INACCURACY;
  if (swing >= 200) return EXCELLENT;
  return NORMAL;
}

/**
 * @param {string} pgn - a finished game's PGN
 * @param {import("../engine/stockfishEngine.js").Engine} engine - a ready Engine instance
 * @param {{ depth?: number, maxDefiningMoves?: number, onProgress?: (done: number, total: number) => void }} [opts]
 * @returns {Promise<{ plies: object[], definingMoves: object[], evalTrack: {ply:number, evalCp:number}[] }>}
 */
export async function analyzeGame(pgn, engine, { depth = 12, maxDefiningMoves = 6, onProgress } = {}) {
  const walker = new Chess();
  walker.loadPgn(pgn);
  const moveList = walker.history({ verbose: true });

  const replay = new Chess();
  const plies = [];
  let evalBeforeWhitePerspective = 0; // startpos is roughly balanced

  for (let i = 0; i < moveList.length; i++) {
    const move = moveList[i];
    const applied = replay.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!applied) break; // defensive — shouldn't happen against a legal PGN

    // eslint-disable-next-line no-await-in-loop -- sequential by design, one engine instance
    const { evalCp, mate } = await engine.analyzePosition(replay.fen(), { depth });
    // UCI's score is always from the perspective of whoever is to move in
    // the FEN just sent — which alternates every ply regardless of who
    // made the move. After a White move it's Black to move (raw score is
    // Black's perspective, needs negating); after a Black move it's
    // White to move (raw score is already White's perspective).
    const evalAfterWhitePerspective = applied.color === "w" ? -evalCp : evalCp;

    const moverSign = applied.color === "w" ? 1 : -1;
    const beforeForMover = moverSign * evalBeforeWhitePerspective;
    const afterForMover = moverSign * evalAfterWhitePerspective;
    const swing = afterForMover - beforeForMover;

    plies.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: applied.color,
      san: applied.san,
      isCapture: Boolean(applied.captured),
      isCastle: applied.san === "O-O" || applied.san === "O-O-O",
      isCheckmate: applied.san.includes("#"),
      isCheck: applied.san.includes("+") && !applied.san.includes("#"),
      evalCp: evalAfterWhitePerspective,
      mate,
      swing,
      classification: classify(swing),
      fen: replay.fen(),
    });

    evalBeforeWhitePerspective = evalAfterWhitePerspective;
    onProgress?.(i + 1, moveList.length);
  }

  return {
    plies,
    definingMoves: pickDefiningMoves(plies, maxDefiningMoves),
    evalTrack: plies.map((p) => ({ ply: p.ply, evalCp: p.evalCp })),
  };
}

/**
 * Always includes the checkmating move (if any), the game's final move
 * (a resignation/timeout has no "blunder" to point to, but the moment
 * still belongs on the timeline), and the game's first real blunder (a
 * concrete "turning point"). Remaining slots fill with the largest swings
 * in either direction, capped at maxCount and excluding non-notable moves.
 */
function pickDefiningMoves(plies, maxCount) {
  const flagged = new Map();
  const add = (ply) => {
    if (ply) flagged.set(ply.ply, ply);
  };

  add(plies.find((p) => p.isCheckmate));
  add(plies[plies.length - 1]);
  add(plies.find((p) => p.classification === BLUNDER));

  const byMagnitude = [...plies].sort((a, b) => Math.abs(b.swing) - Math.abs(a.swing));
  for (const p of byMagnitude) {
    if (flagged.size >= maxCount) break;
    if (p.classification === NORMAL) continue;
    add(p);
  }

  return [...flagged.values()].sort((a, b) => a.ply - b.ply);
}
