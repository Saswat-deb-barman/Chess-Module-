import { Chess } from "chess.js";

/**
 * Thin wrapper around chess.js so components don't talk to the library
 * directly. Keeps Board.jsx focused on rendering/drag-drop, and keeps a
 * single place to change if we ever swap the underlying chess engine lib.
 *
 * Sets White/Black/Date headers up front so the PGN is a complete record
 * from move one — Phase 2's game log takes this same PGN as its row
 * payload, so there's no later pass needed to backfill who played.
 */
export function createGame({ white = "Human", black = "Bot" } = {}) {
  const game = new Chess();
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", ".");
  game.header("White", white, "Black", black, "Date", today);
  return game;
}

/**
 * Attempts a move. Returns the move object on success, or null on an
 * illegal move (caller should snapback the piece in the UI).
 * Always promotes to queen for Phase 1 — a promotion-choice UI is a
 * nice-to-have we're deliberately deferring.
 */
export function tryMove(game, from, to, promotion = "q") {
  try {
    return game.move({ from, to, promotion });
  } catch {
    return null;
  }
}

/**
 * Returns a human-readable result string once the game is over, or null
 * if the game is still in progress. Distinguishes flag-fall wins from
 * checkmate/draws — the two share "game over" but not the same message.
 */
export function getGameOverReason(game, { flagFallWinner } = {}) {
  if (flagFallWinner) {
    return `${flagFallWinner === "w" ? "White" : "Black"} wins on time`;
  }
  if (!game.isGameOver()) return null;

  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Black" : "White";
    return `${winner} wins by checkmate`;
  }
  if (game.isStalemate()) return "Draw by stalemate";
  if (game.isThreefoldRepetition()) return "Draw by threefold repetition";
  if (game.isInsufficientMaterial()) return "Draw by insufficient material";
  if (game.isDraw()) return "Draw (50-move rule)";
  return "Game over";
}

/**
 * Standard PGN Result tag ("1-0" / "0-1" / "1/2-1/2" / "*") for the game's
 * current state. Kept separate from getGameOverReason since that returns
 * prose for the UI, not the tag format PGN readers expect.
 *
 * flagFallWinner and resignedBy both cover endings chess.js itself
 * doesn't know about — the game isn't actually isGameOver() when someone
 * resigns or times out, so both have to be handled before falling
 * through to chess.js's own over/checkmate/draw checks.
 */
export function getResultTag(game, { flagFallWinner, resignedBy } = {}) {
  if (flagFallWinner) return flagFallWinner === "w" ? "1-0" : "0-1";
  if (resignedBy) return resignedBy === "w" ? "0-1" : "1-0";
  if (!game.isGameOver()) return "*";
  if (game.isCheckmate()) return game.turn() === "w" ? "0-1" : "1-0";
  return "1/2-1/2";
}

export function toFen(game) {
  return game.fen();
}

export function toPgn(game) {
  return game.pgn();
}
