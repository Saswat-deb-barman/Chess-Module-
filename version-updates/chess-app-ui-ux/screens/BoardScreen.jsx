function BoardScreen({ onEnd }) {
  const { Card, MoveChip, TimerRing, Button } = window.ChessForDummiesDesignSystem_aa0fdd;
  const [councilMsg] = React.useState("Nicely spotted — that fork wins material.");

  // Static 8x8 demo position, purely illustrative — legal-move hint from e4-ish square.
  const files = "ABCDEFGH".split("");
  const legalDots = ["c6", "d5", "e4", "f3"]; // decorative, matches reference's dashed trajectory feel

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px" }}>
        <TimerRing progress={0.71} label="7:06" size={48} />
        <span style={{ font: "var(--text-caption)", color: "var(--text-secondary)", alignSelf: "center" }}>Your move</span>
        <TimerRing progress={0.98} label="9:48" size={48} active />
      </div>

      <div
        style={{
          position: "relative", width: "100%", aspectRatio: "1", borderRadius: "var(--radius-md)",
          overflow: "hidden", boxShadow: "var(--shadow-md)",
          display: "grid", gridTemplateColumns: "repeat(8,1fr)", gridTemplateRows: "repeat(8,1fr)",
        }}
      >
        {Array.from({ length: 64 }).map((_, i) => {
          const row = Math.floor(i / 8), col = i % 8;
          const dark = (row + col) % 2 === 1;
          const sq = `${files[col].toLowerCase()}${8 - row}`;
          const isLegal = legalDots.includes(sq);
          const isSelected = sq === "e5";
          return (
            <div
              key={i}
              style={{
                background: dark ? "#5b6270" : "#eef0ee",
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                outline: isSelected ? "3px solid var(--accent-blue)" : "none", outlineOffset: "-3px",
              }}
            >
              {isLegal && <div style={{ width: "22%", height: "22%", borderRadius: "50%", background: "var(--accent-blue)", opacity: 0.85 }} />}
              {sq === "e5" && <div style={{ fontSize: "min(6vw,32px)", color: "#1c1c1c" }}>♞</div>}
              {sq === "f3" && <div style={{ fontSize: "min(6vw,32px)", color: "#fafafa", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}>♗</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 0" }}>
        <MoveChip moveNumber={20} color="w" san="Be5" />
        <MoveChip san="Nd7" />
        <MoveChip san="Nxc5" active />
        <MoveChip san="dxc5" />
      </div>

      <Card variant="glass">
        <div style={{ font: "var(--text-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--warm-bronze)", marginBottom: 6 }}>The Council</div>
        <p style={{ margin: 0, font: "var(--text-body)", color: "var(--text-primary)" }}>{councilMsg}</p>
      </Card>

      <Button variant="secondary" onClick={onEnd}>Resign</Button>
    </div>
  );
}
window.BoardScreen = BoardScreen;
