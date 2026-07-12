/** Persistent bottom icon nav — 4-5 icon-only buttons, active gets a solid blue filled circle. */
function BottomNav({
  items = [],
  activeKey,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "10px 8px calc(10px + env(safe-area-inset-bottom))",
      background: "var(--surface-1)",
      borderTop: "1px solid var(--glass-border)",
      position: "sticky",
      bottom: 0,
      left: 0,
      right: 0
    }
  }, items.map(item => {
    const active = item.key === activeKey;
    return /*#__PURE__*/React.createElement("button", {
      key: item.key,
      onClick: () => onSelect?.(item.key),
      "aria-label": item.label,
      style: {
        position: "relative",
        width: "var(--touch-target-min)",
        height: "var(--touch-target-min)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        background: active ? "var(--accent-blue)" : "transparent",
        color: active ? "var(--text-on-accent)" : "var(--text-secondary)",
        transition: "background var(--duration-base) var(--ease-standard)"
      }
    }, item.icon, item.badge ? /*#__PURE__*/React.createElement("span", {
      style: {
        position: "absolute",
        top: 2,
        right: 4,
        minWidth: 16,
        height: 16,
        padding: "0 4px",
        background: "var(--quality-blunder)",
        color: "#fff",
        borderRadius: "var(--radius-pill)",
        fontSize: "0.62rem",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)"
      }
    }, item.badge) : null);
  }));
}
Object.assign(__ds_scope, { BottomNav });
