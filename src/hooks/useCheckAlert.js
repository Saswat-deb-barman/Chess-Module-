import { useMemo } from "react";
import { getKingSquare } from "../lib/gameLogic.js";

/**
 * CM-204: derives check state straight from the current position — no
 * parallel state, same "single source of truth" pattern as isMyTurn/Clock.
 * The side to move is always the side that would be in check (chess.js
 * never lets a position exist where the side NOT to move is in check),
 * so `game.turn()` doubles as "who's checked" whenever `inCheck()` is true.
 * Recomputed on `fen` change so a resolved check clears automatically.
 */
export function useCheckAlert(game, fen) {
  return useMemo(() => {
    const inCheck = game.inCheck();
    if (!inCheck) return { checkedColor: null, checkedKingSquare: null, isCheckmate: false };
    const checkedColor = game.turn();
    return {
      checkedColor,
      checkedKingSquare: getKingSquare(game, checkedColor),
      isCheckmate: game.isCheckmate(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, fen]);
}
