function CouncilReportScreen({ onNewGame }) {
  const { Piece, Badge, MoveChip, Card, Button } = window.ChessForDummiesDesignSystem_aa0fdd;

  const MOVES = [
    { tag: "excellent", label: "20. Be5", caption: "Centralizing the bishop cements the outpost — Black has no good answer." },
    { tag: "blunder", label: "22… Qxd4", caption: "Walks straight into a knight fork — this is the game's defining moment." },
    { tag: "mistake", label: "24. Rc1", caption: "Rc1 was fine, but Rd1 kept more pressure on the isolated d-pawn." },
  ];

  const PERSONAS = [
    { name: "The Historian", text: "This mirrors a classic Capablanca endgame technique — trade down, then convert." },
    { name: "Tactics Tara", text: "That knight fork at move 22 was sitting there for three moves — always scan for forks after captures." },
    { name: "Strategist Sam", text: "White's whole plan was minority attack on the queenside — textbook execution." },
    { name: "Endgame Ed", text: "The resulting rook endgame was a clean win once the extra pawn locked in." },
    { name: "Coach Priya", text: "Solid game overall — tighten up tactical vigilance right after you win material." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
      <Piece type="king" color="w" size={110} basePath="../../" renderSrc={window.__resources && window.__resources.pieceKingW} />
      <div>
        <p style={{ margin: 0, font: "var(--text-display-lg)", color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "var(--tracking-hero)" }}>White wins</p>
        <p style={{ margin: "4px 0 0", font: "var(--text-caption)", color: "var(--text-secondary)" }}>by checkmate, move 31</p>
      </div>

      <div style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
        {MOVES.map((m) => (
          <Card key={m.label} variant="solid" padding="12px 14px">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Badge tone={m.tag} />
              <span style={{ font: "600 0.85rem/1 var(--font-mono)", color: "var(--text-primary)" }}>{m.label}</span>
            </div>
            <p style={{ margin: 0, font: "var(--text-caption)", fontWeight: 500, color: "var(--text-secondary)", textAlign: "left" }}>{m.caption}</p>
          </Card>
        ))}
      </div>

      <div style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
        {PERSONAS.map((p) => (
          <Card key={p.name} variant="glass" padding="12px 14px">
            <h4 style={{ margin: "0 0 4px", font: "var(--text-caption)", color: "var(--warm-bronze)" }}>{p.name}</h4>
            <p style={{ margin: 0, font: "var(--text-body)", color: "var(--text-primary)" }}>{p.text}</p>
          </Card>
        ))}
      </div>

      <Button variant="primary" onClick={onNewGame}>New game</Button>
    </div>
  );
}
window.CouncilReportScreen = CouncilReportScreen;
