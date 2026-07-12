function DifficultySelector({ value, onChange }) {
  const { Card } = window.ChessForDummiesDesignSystem_aa0fdd;
  const LEVELS = [
    { key: "easy", label: "Easy" },
    { key: "medium", label: "Medium" },
    { key: "hard", label: "Hard" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ font: "var(--text-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--warm-bronze)" }}>
        Bot difficulty
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        {LEVELS.map((l) => {
          const active = value === l.key;
          return (
            <button
              key={l.key}
              onClick={() => onChange(l.key)}
              style={{
                flex: 1, padding: "12px 0", borderRadius: "var(--radius-pill)",
                border: active ? "1px solid var(--accent-blue)" : "1px solid var(--glass-border)",
                background: active ? "var(--accent-blue-soft)" : "var(--glass-fill)",
                color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontWeight: 700,
                fontSize: "0.9rem", cursor: "pointer", minHeight: "var(--touch-target-min)",
                backdropFilter: "blur(var(--glass-blur))",
              }}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
window.DifficultySelector = DifficultySelector;
