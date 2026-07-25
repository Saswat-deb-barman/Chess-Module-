import { useEffect, useRef, useState } from "react";

const MIN_WIDTH_DELTA = 4;

/**
 * CM-201: react-chessboard@4.7.2 reads its `boardWidth` prop via
 * `useState(props.boardWidth)` and never re-syncs it after mount (its
 * only call to `setBoardWidth` lives inside its own fallback
 * auto-measurement effect, which is itself keyed on `[boardRef.current]`
 * — a ref value that never changes identity across renders, so that
 * effect only ever runs once). Reproduced live: after a viewport resize,
 * the board's container correctly shrinks but the rendered board keeps
 * overflowing at its old pixel width — which is what puts a dragged
 * piece under the wrong grid cell.
 *
 * Passing a changing `boardWidth` prop doesn't fix this by itself, since
 * the library never re-reads it post-mount. The caller must remount the
 * board (e.g. `<Chessboard key={boardWidth} boardWidth={boardWidth} />`)
 * whenever this hook's measurement changes.
 */
export function useBoardWidth() {
  const containerRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function measure(width) {
      setBoardWidth((prev) => (Math.abs(prev - width) < MIN_WIDTH_DELTA ? prev : Math.round(width)));
    }

    measure(node.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => measure(entries[0].contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [containerRef, boardWidth];
}
