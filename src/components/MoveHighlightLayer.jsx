const SELECTED_STYLE = {
  boxShadow: "inset 0 0 0 3px rgba(58, 125, 68, 0.85)",
};

// Centered dot for a quiet legal move to an empty square.
const TARGET_STYLE = {
  backgroundImage:
    "radial-gradient(circle, rgba(0,0,0,0.28) 22%, transparent 23%)",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

// Ring/cut-corner treatment for a legal move that captures — chess.js's
// verbose move objects already flag `captured` correctly for en passant,
// so this single check covers ordinary captures and en passant alike.
const CAPTURE_STYLE = {
  boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.28)",
};

/**
 * CM-203: builds the `customSquareStyles` object react-chessboard expects,
 * from the currently selected square and its legal targets (verbose chess.js
 * move objects, see useLegalTargets). Pure function, no React involved —
 * despite the .jsx extension (kept for consistency with the plan/ticket
 * naming), there's no JSX here to render.
 */
export function buildMoveHighlightStyles(selectedSquare, targets) {
  const styles = {};
  if (selectedSquare) {
    styles[selectedSquare] = SELECTED_STYLE;
  }
  for (const move of targets) {
    styles[move.to] = move.captured ? CAPTURE_STYLE : TARGET_STYLE;
  }
  return styles;
}
