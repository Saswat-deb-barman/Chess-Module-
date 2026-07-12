function Modal({
  open,
  title,
  onClose,
  children
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 100,
      background: "rgba(10,12,15,0.55)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center"
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: "min(480px, 100%)",
      maxHeight: "80vh",
      overflowY: "auto",
      background: "var(--glass-fill-strong)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      border: "1px solid var(--glass-border)",
      borderTopLeftRadius: "var(--radius-xl)",
      borderTopRightRadius: "var(--radius-xl)",
      boxShadow: "var(--shadow-lg)",
      padding: "24px 20px calc(24px + env(safe-area-inset-bottom))",
      fontFamily: "var(--font-sans)",
      color: "var(--text-primary)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "var(--text-title)",
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "icon",
    onClick: onClose
  }, "\u2715")), children));
}
Object.assign(__ds_scope, { Modal });
