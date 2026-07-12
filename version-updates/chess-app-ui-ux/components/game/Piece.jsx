const GLYPH = {
  king: {
    w: "\u2654",
    b: "\u265A"
  },
  queen: {
    w: "\u2655",
    b: "\u265B"
  },
  rook: {
    w: "\u2656",
    b: "\u265C"
  },
  bishop: {
    w: "\u2657",
    b: "\u265D"
  },
  knight: {
    w: "\u2658",
    b: "\u265E"
  },
  pawn: {
    w: "\u2659",
    b: "\u265F"
  }
};

/**
 * Renders the user-supplied chess-set illustration (assets/pieces/) by
 * default — a flat/vector set, not the brief's original photoreal 3D
 * chrome/glass ask, but a real approved asset rather than a placeholder.
 * See PIECES.md for the sourcing note. Falls back to a styled Unicode
 * glyph only if a type/color combination has no shipped asset, or pass
 * `renderSrc` to force a specific image.
 */
function Piece({
  type = "king",
  color = "w",
  size = 120,
  renderSrc,
  basePath = "",
  dropShadow = true
}) {
  const src = renderSrc ?? `${basePath}assets/pieces/${color}-${type}.png`;
  // Black pieces are a near-solid dark silhouette — on this system's dark
  // gradient/glass surfaces they'd otherwise vanish, so they get a soft
  // light rim-glow (in addition to the usual contact shadow) to stay
  // legible. White pieces only need the contact shadow.
  const rim = color === "b" ? `drop-shadow(0 0 ${Math.max(2, size * 0.035)}px rgba(255,255,255,0.55)) drop-shadow(0 0 ${Math.max(4, size * 0.09)}px rgba(255,255,255,0.22))` : "";
  const contact = dropShadow ? "drop-shadow(var(--shadow-piece))" : "";
  const filter = [rim, contact].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: `${color === "w" ? "White" : "Black"} ${type}`,
    style: {
      width: size,
      height: size,
      objectFit: "contain",
      filter: filter || undefined
    },
    onError: e => {
      // Defensive fallback to the Unicode glyph if an asset is ever missing.
      e.target.outerHTML = `<span role="img" aria-label="${color === "w" ? "White" : "Black"} ${type}" style="display:inline-block;font-size:${size}px;line-height:1;font-family:serif;color:${color === "w" ? "var(--piece-white-2)" : "var(--piece-black-2)"}">${GLYPH[type][color]}</span>`;
    }
  });
}
Object.assign(__ds_scope, { Piece });
