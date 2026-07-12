function FriendLobbyScreen({ screen, onCreate, onJoinScreen, roomCode }) {
  const { Card, Button } = window.ChessForDummiesDesignSystem_aa0fdd;

  if (screen === "waiting") {
    return (
      <Card variant="glass" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ margin: 0, font: "var(--text-body)", color: "var(--text-secondary)" }}>Share this code or link with your friend:</p>
        <p style={{ margin: 0, font: "700 2rem/1 var(--font-mono)", letterSpacing: "0.12em", color: "var(--accent-blue)" }}>{roomCode}</p>
        <input
          readOnly value={`chess-module.vercel.app/?room=${roomCode}`}
          style={{
            padding: "10px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-border)",
            background: "var(--surface-1)", color: "var(--text-secondary)", textAlign: "center", font: "var(--text-caption)",
          }}
        />
        <p style={{ margin: 0, font: "var(--text-caption)", color: "var(--text-muted)", fontStyle: "italic" }}>Waiting for your friend to join…</p>
      </Card>
    );
  }

  if (screen === "join") {
    return (
      <Card variant="glass" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>Enter room code</label>
        <input
          placeholder="e.g. FFJG66"
          style={{
            padding: "12px 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-border)",
            background: "var(--surface-1)", color: "var(--text-primary)", textAlign: "center", font: "var(--text-body)",
          }}
        />
        <Button variant="primary">Join</Button>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <Button variant="primary" onClick={onCreate}>Create a room</Button>
      <button
        onClick={onJoinScreen}
        style={{ background: "none", border: "none", color: "var(--text-secondary)", font: "var(--text-caption)", textDecoration: "underline", cursor: "pointer" }}
      >
        Have a room code?
      </button>
    </div>
  );
}
window.FriendLobbyScreen = FriendLobbyScreen;
