/**
 * Circular ring-style countdown timer — filled arc, not a digital-only readout.
 * progress: 0..1 of time remaining.
 */
function TimerRing({
  progress = 1,
  label,
  size = 56,
  active = false,
  warn = false
}) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, progress));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: size,
      height: size,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 56 56",
    style: {
      transform: "rotate(-90deg)"
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "28",
    cy: "28",
    r: r,
    fill: "none",
    stroke: "var(--glass-fill)",
    strokeWidth: "4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "28",
    cy: "28",
    r: r,
    fill: "none",
    stroke: warn ? "var(--quality-blunder)" : active ? "var(--accent-blue)" : "var(--text-muted)",
    strokeWidth: "4",
    strokeLinecap: "round",
    strokeDasharray: `${dash} ${c}`,
    style: {
      transition: "stroke-dasharray var(--duration-base) linear"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      fontFamily: "var(--font-sans)",
      fontVariantNumeric: "tabular-nums",
      fontWeight: 700,
      fontSize: size * 0.2,
      color: "var(--text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { TimerRing });
