const SELECTED_STYLE = {
  boxShadow: "inset 0 0 0 3px var(--sq-select)",
};

// Centered dot for a quiet legal move to an empty square.
const TARGET_STYLE = {
  backgroundImage: "radial-gradient(circle, var(--sq-dot) 26%, transparent 27%)",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

// Ring/cut-corner treatment for a legal move that captures — chess.js's
// verbose move objects already flag `captured` correctly for en passant,
// so this single check covers ordinary captures and en passant alike.
// A ring, not a dot: a capture must never look like a quiet move.
const CAPTURE_STYLE = {
  boxShadow: "inset 0 0 0 4px var(--sq-dot)",
};

// CM-204: red radial glow on the checked king's square. Uses
// backgroundImage (not boxShadow) specifically so it composes cleanly
// with SELECTED_STYLE's boxShadow-based ring if a player selects their
// own king while in check — both can apply to the same square at once.
const CHECK_GLOW_STYLE = {
  backgroundImage: "radial-gradient(circle, var(--sq-check) 0%, rgba(199,68,64,.45) 55%, transparent 75%)",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};

/**
 * CM-203/CM-204: builds the `customSquareStyles` object react-chessboard
 * expects, from the currently selected square, its legal targets (verbose
 * chess.js move objects, see useLegalTargets), and the checked king's
 * square if any. Pure function, no React involved — despite the .jsx
 * extension (kept for consistency with the plan/ticket naming), there's
 * no JSX here to render.
 */
export function buildMoveHighlightStyles(selectedSquare, targets, checkedKingSquare) {
  const styles = {};
  if (selectedSquare) {
    styles[selectedSquare] = SELECTED_STYLE;
  }
  for (const move of targets) {
    styles[move.to] = move.captured ? CAPTURE_STYLE : TARGET_STYLE;
  }
  if (checkedKingSquare) {
    styles[checkedKingSquare] = { ...styles[checkedKingSquare], ...CHECK_GLOW_STYLE };
  }
  return styles;
}
