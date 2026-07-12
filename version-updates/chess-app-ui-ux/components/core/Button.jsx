function Button({
  variant = "primary",
  size = "md",
  icon,
  disabled,
  children,
  onClick,
  type = "button"
}) {
  const isIconOnly = variant === "icon";
  const base = {
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    fontSize: size === "sm" ? "0.85rem" : "0.95rem",
    letterSpacing: "0.01em",
    border: "none",
    borderRadius: "var(--radius-pill)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "transform var(--duration-fast) var(--ease-standard), background var(--duration-base) var(--ease-standard)",
    minHeight: "var(--touch-target-min)"
  };
  const variants = {
    primary: {
      background: "var(--accent-blue)",
      color: "var(--text-on-accent)",
      padding: size === "sm" ? "10px 18px" : "13px 26px",
      boxShadow: "var(--shadow-sm)"
    },
    secondary: {
      background: "var(--glass-fill)",
      color: "var(--text-primary)",
      border: "1px solid var(--glass-border)",
      backdropFilter: "blur(var(--glass-blur))",
      padding: size === "sm" ? "9px 17px" : "12px 25px"
    },
    icon: {
      background: "var(--glass-fill)",
      border: "1px solid var(--glass-border)",
      color: "var(--text-primary)",
      width: "var(--touch-target-min)",
      height: "var(--touch-target-min)",
      borderRadius: "50%",
      padding: 0
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    style: {
      ...base,
      ...variants[variant]
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.96)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, icon, !isIconOnly && children);
}
Object.assign(__ds_scope, { Button });
