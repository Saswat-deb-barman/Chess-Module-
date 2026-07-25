import { useEffect } from "react";

const BASE_TITLE = document.title;

/**
 * CM-202: while the tab is backgrounded and it's the local player's turn,
 * flash "(1) Your move · <title>" so a backgrounded tab still signals
 * it's waiting on you. Restored immediately on focus (or unmount).
 */
export function useDocumentTitle(isMyTurn) {
  useEffect(() => {
    function applyTitle() {
      document.title = document.hidden && isMyTurn ? `(1) Your move · ${BASE_TITLE}` : BASE_TITLE;
    }
    applyTitle();
    document.addEventListener("visibilitychange", applyTitle);
    return () => {
      document.removeEventListener("visibilitychange", applyTitle);
      document.title = BASE_TITLE;
    };
  }, [isMyTurn]);
}
