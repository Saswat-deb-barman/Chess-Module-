/** Small pill chip for a single move in algebraic notation, e.g. "Nxc5". */
function MoveChip({
  san,
  moveNumber,
  color,
  active = false,
  tone = "neutral"
}) {
  const toneBg = {
    neutral: active ? "var(--accent-blue-soft)" : "var(--glass-fill)",
    excellent: "rgba(63,174,114,0.16)",
    mistake: "rgba(217,138,68,0.16)",
    blunder: "rgba(217,84,79,0.16)"
  };
  const toneBorder = {
    neutral: active ? "var(--accent-blue)" : "var(--glass-border)",
    excellent: "var(--quality-excellent)",
    mistake: "var(--quality-mistake)",
    blunder: "var(--quality-blunder)"
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontFamily: "var(--font-mono)",
      fontSize: "0.82rem",
      fontVariantNumeric: "tabular-nums",
      color: "var(--text-primary)",
      background: toneBg[tone],
      border: `1px solid ${toneBorder[tone]}`,
      borderRadius: "var(--radius-pill)",
      padding: "5px 12px"
    }
  }, moveNumber != null && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)"
    }
  }, moveNumber, color === "b" ? "…" : "."), san);
}
Object.assign(__ds_scope, { MoveChip });
