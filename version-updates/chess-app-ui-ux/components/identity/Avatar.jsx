/** Circular avatar photo with a colored status/turn ring. */
function Avatar({
  src,
  name,
  size = 48,
  ringColor = "var(--accent-blue)",
  ring = true
}) {
  const initials = (name || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      padding: ring ? 3 : 0,
      background: ring ? ringColor : "transparent",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: ring ? "var(--shadow-sm)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      overflow: "hidden",
      background: "var(--surface-3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "2px solid var(--bg-base)"
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 700,
      color: "var(--text-secondary)",
      fontSize: size * 0.32
    }
  }, initials)));
}
Object.assign(__ds_scope, { Avatar });
