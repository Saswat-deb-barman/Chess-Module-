function GameHistoryScreen() {
  const { Card, Badge } = window.ChessForDummiesDesignSystem_aa0fdd;
  const [expanded, setExpanded] = React.useState(0);

  const GAMES = [
    { id: 1, date: "Jul 10", opponent: "Stockfish (Hard)", mode: "bot", result: "1–0", recap: "A clean minority-attack win — White's queenside pressure never let up." },
    { id: 2, date: "Jul 8", opponent: "Jessica", mode: "friend", result: "0–1", recap: null },
    { id: 3, date: "Jul 5", opponent: "Stockfish (Medium)", mode: "bot", result: "½–½", recap: "Traded into a drawn rook endgame — the right result given the position." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ font: "var(--text-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--warm-bronze)" }}>
        Match history &amp; analysis
      </span>
      {GAMES.map((g, i) => (
        <Card key={g.id} variant="solid" padding="0" style={{ overflow: "hidden" }}>
          <button
            onClick={() => setExpanded(expanded === i ? -1 : i)}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ font: "var(--text-body)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              {g.date} — vs {g.opponent}
              <Badge tone="neutral">{g.mode}</Badge>
            </span>
            <span style={{ font: "700 0.85rem/1 var(--font-mono)", color: "var(--text-secondary)" }}>{g.result}</span>
          </button>
          {expanded === i && (
            <div style={{ padding: "0 16px 16px" }}>
              {g.recap ? (
                <p style={{ margin: "0 0 10px", font: "var(--text-caption)", fontWeight: 500, color: "var(--text-secondary)", background: "var(--glass-fill)", padding: 10, borderRadius: "var(--radius-sm)" }}>{g.recap}</p>
              ) : (
                <p style={{ margin: "0 0 10px", font: "var(--text-caption)", fontStyle: "italic", color: "var(--text-muted)" }}>No analysis available for this game.</p>
              )}
              <input
                placeholder="Ask a question about this game…"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-border)", background: "var(--surface-1)", color: "var(--text-primary)", font: "var(--text-caption)" }}
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
window.GameHistoryScreen = GameHistoryScreen;
