import { useMemo } from "react";
import { getLegalMoves } from "../lib/gameLogic.js";

/**
 * CM-203: verbose legal moves from `selectedSquare` in the current
 * position. Recomputed on `fen` change (not just `selectedSquare`) since
 * `game` is a mutable chess.js instance whose position can change without
 * the selection itself changing (e.g. a move lands elsewhere).
 */
export function useLegalTargets(game, selectedSquare, fen) {
  return useMemo(
    () => getLegalMoves(game, selectedSquare),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, selectedSquare, fen]
  );
}
