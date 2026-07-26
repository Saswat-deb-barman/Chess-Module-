import { Chess } from "chess.js";

/**
 * Player-facing "pattern" buckets, mapped from the council's existing
 * engine classifications + the game row itself. One server-only module,
 * imported by both GET /me/stats (ranking/aggregation) and the games
 * list (attached per-row) — never reimplemented client-side, and never
 * baked into the cached council_report, so improvements here apply
 * retroactively to every historical game without regenerating anything.
 *
 * Matches the taxonomy the owner already tracks outside this app.
 */
export const PATTERNS = {
  hanging_pieces: { label: "Hanging pieces" },
  wandering_queen: { label: "Wandering queen / stalemate traps" },
  lost_won_on_time: { label: "Losing won positions on time" },
  king_shelter: { label: "Dismantled king shelter" },
};

const QUEEN_MOVE_FULL_MOVE_LIMIT = 15;
const QUEEN_MOVE_THRESHOLD = 3;
const WINNING_EVAL_CP_THRESHOLD = 100;

/**
 * Detects which patterns (0+) a finished game exhibits, from the
 * requesting user's own perspective — never the opponent's. Replays the
 * FULL pgn (not just the capped council_report.definingMoves subset),
 * since detection needs the whole move sequence chess.js can always
 * give back from the stored pgn text, regardless of what got flagged.
 *
 * Fails soft to [] on any malformed/missing pgn — a bad row should
 * never break the whole /me/stats aggregation or games list.
 */
export function detectPatterns(game, viewerSub) {
  if (!game?.pgn) return [];

  const hits = [];
  const myColor = game.black_google_sub === viewerSub ? "b" : "w";

  const walker = new Chess();
  try {
    walker.loadPgn(game.pgn);
  } catch {
    return [];
  }
  const history = walker.history({ verbose: true });
  if (history.length === 0) return [];

  // hanging_pieces: I moved a piece to a square, and the very next ply
  // (the opponent's reply) captures on that same square — a piece left
  // or placed en prise, not just a generally weak move.
  for (let i = 0; i < history.length - 1; i++) {
    const mine = history[i];
    const theirs = history[i + 1];
    if (mine.color === myColor && theirs.captured && theirs.to === mine.to) {
      hits.push("hanging_pieces");
      break;
    }
  }

  // wandering_queen: my queen moved 3+ times inside the opening/early
  // middlegame — the same "queen out too early, chased around" shape
  // that also tends to end in self-inflicted stalemate traps.
  const queenMoves = history.filter(
    (m, i) => m.color === myColor && m.piece === "q" && Math.floor(i / 2) < QUEEN_MOVE_FULL_MOVE_LIMIT
  );
  if (queenMoves.length >= QUEEN_MOVE_THRESHOLD) hits.push("wandering_queen");

  // king_shelter: I never castled, and either the game ended in
  // checkmate against me or the council flagged a blunder on my side —
  // castling omission alone isn't a pattern hit, it needs a real
  // consequence attached.
  const definingMoves = game.council_report?.definingMoves ?? [];
  const myCastled = history.some((m) => m.color === myColor && (m.san === "O-O" || m.san === "O-O-O"));
  const blunderAgainstMe = definingMoves.some((m) => m.color === myColor && m.classification === "blunder");
  const lastMove = history[history.length - 1];
  const lostByCheckmate = Boolean(lastMove?.san?.includes("#")) && lastMove.color !== myColor;
  if (!myCastled && (blunderAgainstMe || lostByCheckmate)) hits.push("king_shelter");

  // lost_won_on_time: needs result_reason (added this cycle — historical
  // rows have it null, which correctly yields zero hits here, not a
  // crash). Uses the last flagged defining move's eval as a proxy for
  // "was I actually winning" — the full per-ply eval track is never
  // persisted (only the capped definingMoves subset is), so this is a
  // deliberate approximation, not exact.
  if (game.result_reason && /wins on time/i.test(game.result_reason)) {
    const winnerColor = game.result === "1-0" ? "w" : game.result === "0-1" ? "b" : null;
    const lastDefining = definingMoves[definingMoves.length - 1];
    if (winnerColor && winnerColor !== myColor && lastDefining?.evalCp != null) {
      const myEvalCp = myColor === "w" ? lastDefining.evalCp : -lastDefining.evalCp;
      if (myEvalCp > WINNING_EVAL_CP_THRESHOLD) hits.push("lost_won_on_time");
    }
  }

  return hits;
}
