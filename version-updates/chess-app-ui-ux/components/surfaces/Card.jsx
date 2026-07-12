function Card({
  variant = "glass",
  padding = "20px",
  radius = "var(--radius-lg)",
  children,
  style
}) {
  const base = {
    borderRadius: radius,
    padding,
    fontFamily: "var(--font-sans)",
    color: "var(--text-primary)",
    boxSizing: "border-box"
  };
  const variants = {
    glass: {
      background: "var(--glass-fill)",
      border: "1px solid var(--glass-border)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      boxShadow: "var(--shadow-glass)"
    },
    solid: {
      background: "var(--surface-2)",
      border: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "var(--shadow-sm)"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
