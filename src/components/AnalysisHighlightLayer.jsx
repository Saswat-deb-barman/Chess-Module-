/**
 * The analysis highlight vocabulary — origin (gold), target/good (green),
 * danger (red) — used app-wide (analysis replay, drills, in-game move
 * captions later), not just here. A parallel pure function to
 * MoveHighlightLayer.jsx's buildMoveHighlightStyles rather than a grown
 * signature on it: that function stays scoped to live-play concepts
 * (selection/legal-targets/check) with its own 2 existing callers
 * untouched; this one is a second, independent sibling with the same
 * customSquareStyles-shaped return react-chessboard expects.
 */
const ORIGIN_STYLE = {
  boxShadow: "inset 0 0 0 3px var(--hl-origin)",
};

const GOOD_STYLE = {
  boxShadow: "inset 0 0 0 3px var(--hl-good)",
};

const DANGER_STYLE = {
  boxShadow: "inset 0 0 0 3px var(--hl-danger)",
};

export function buildAnalysisHighlightStyles(originSquares = [], targetSquares = [], dangerSquares = []) {
  const styles = {};
  for (const square of originSquares) {
    styles[square] = { ...styles[square], ...ORIGIN_STYLE };
  }
  for (const square of targetSquares) {
    styles[square] = { ...styles[square], ...GOOD_STYLE };
  }
  for (const square of dangerSquares) {
    styles[square] = { ...styles[square], ...DANGER_STYLE };
  }
  return styles;
}
