function SignInButton({ user, onSignIn, onSignOut }) {
  const { Avatar, Button } = window.ChessForDummiesDesignSystem_aa0fdd;
  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
        <Avatar name={user.name} size={32} ringColor="var(--accent-blue)" />
        <span style={{ font: "var(--text-caption)", color: "var(--text-secondary)" }}>{user.email}</span>
        <Button variant="secondary" size="sm" onClick={onSignOut}>Sign out</Button>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        onClick={onSignIn}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
          borderRadius: "var(--radius-pill)", border: "1px solid var(--glass-border)",
          background: "var(--glass-fill)", color: "var(--text-primary)",
          fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
          backdropFilter: "blur(var(--glass-blur))",
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "conic-gradient(#4285F4 0 25%, #34A853 25% 50%, #FBBC05 50% 75%, #EA4335 75% 100%)" }} />
        Sign in with Google
      </button>
    </div>
  );
}
window.SignInButton = SignInButton;
