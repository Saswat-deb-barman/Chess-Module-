function MultiplayerBoardScreen({ onEnd }) {
  const { Avatar, TimerRing, Card, Button } = window.ChessForDummiesDesignSystem_aa0fdd;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Avatar name="Tomasz" ringColor="var(--accent-blue)" />
          <span style={{ font: "var(--text-caption)", color: "var(--text-primary)" }}>Tomasz</span>
          <span style={{ font: "600 0.65rem/1 var(--font-sans)", color: "var(--text-muted)", textTransform: "uppercase" }}>Master</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <TimerRing progress={0.5} label="5:02" size={44} active />
          <TimerRing progress={0.9} label="9:01" size={44} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Avatar name="Jessica" ringColor="var(--text-muted)" />
          <span style={{ font: "var(--text-caption)", color: "var(--text-primary)" }}>Jessica</span>
          <span style={{ font: "600 0.65rem/1 var(--font-sans)", color: "var(--text-muted)", textTransform: "uppercase" }}>Junior</span>
        </div>
      </div>

      <div
        style={{
          width: "100%", aspectRatio: "1", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-md)",
          display: "grid", gridTemplateColumns: "repeat(8,1fr)", gridTemplateRows: "repeat(8,1fr)",
        }}
      >
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8), col = i % 8;
          const dark = (row + col) % 2 === 1;
          return <div key={i} style={{ background: dark ? "#5b6270" : "#eef0ee" }} />;
        })}
      </div>

      <Card variant="glass">
        <div style={{ font: "var(--text-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--warm-bronze)", marginBottom: 6 }}>The Council</div>
        <p style={{ margin: 0, font: "var(--text-body)", color: "var(--text-primary)" }}>Check! Tomasz's king has nowhere obvious to run.</p>
      </Card>

      <Button variant="secondary" onClick={onEnd}>Resign</Button>
    </div>
  );
}
window.MultiplayerBoardScreen = MultiplayerBoardScreen;
