import { Chess } from "chess.js";

/**
 * Server-side port of src/lib/gameLogic.js + Board.jsx's detectMoment —
 * the frontend and this server are separate npm packages, so the pure,
 * DOM-free logic gets duplicated here rather than shared via import.
 * Keep these in sync if either side changes; they're intentionally
 * near-identical rather than abstracted into a shared package, since
 * this project favors a little duplication over premature shared-module
 * plumbing for two files this small.
 */
export function createGame({ white = "Player 1", black = "Player 2" } = {}) {
  const game = new Chess();
  const today = new Date().toISOString().slice(0, 10).replaceAll("-", ".");
  game.header("White", white, "Black", black, "Date", today);
  return game;
}

export function tryMove(game, from, to, promotion = "q") {
  try {
    return game.move({ from, to, promotion });
  } catch {
    return null;
  }
}

export function getGameOverReason(game, { flagFallWinner, resignedBy } = {}) {
  if (flagFallWinner) return `${flagFallWinner === "w" ? "White" : "Black"} wins on time`;
  if (resignedBy) return `${resignedBy === "w" ? "Black" : "White"} wins by resignation`;
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

export function getResultTag(game, { flagFallWinner, resignedBy } = {}) {
  if (flagFallWinner) return flagFallWinner === "w" ? "1-0" : "0-1";
  if (resignedBy) return resignedBy === "w" ? "0-1" : "1-0";
  if (!game.isGameOver()) return "*";
  if (game.isCheckmate()) return game.turn() === "w" ? "0-1" : "1-0";
  return "1/2-1/2";
}

/**
 * Which of the (deliberately few) moments the council reacts to, if any —
 * checked in this order so a checkmating move doesn't also read as a
 * generic "check."
 */
export function detectMoment(game, move) {
  if (game.isCheckmate()) return "checkmate";
  if (game.isCheck()) return "check";
  if (move.captured) return "capture";
  return null;
}

export function toFen(game) {
  return game.fen();
}

export function toPgn(game) {
  return game.pgn();
}
