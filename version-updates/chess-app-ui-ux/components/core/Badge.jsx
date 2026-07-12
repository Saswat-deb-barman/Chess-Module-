const LABEL = {
  blunder: "Blunder",
  mistake: "Mistake",
  inaccuracy: "Inaccuracy",
  excellent: "Excellent",
  neutral: null
};
const COLOR = {
  blunder: "var(--quality-blunder)",
  mistake: "var(--quality-mistake)",
  inaccuracy: "var(--quality-inaccuracy)",
  excellent: "var(--quality-excellent)",
  neutral: "var(--glass-fill)"
};
function Badge({
  tone = "neutral",
  children
}) {
  const dark = tone === "inaccuracy";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      fontSize: "0.65rem",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "3px 10px",
      borderRadius: "var(--radius-pill)",
      background: COLOR[tone],
      color: tone === "neutral" ? "var(--text-secondary)" : dark ? "#241c04" : "#fff",
      border: tone === "neutral" ? "1px solid var(--glass-border)" : "none"
    }
  }, children ?? LABEL[tone]);
}
Object.assign(__ds_scope, { Badge });
