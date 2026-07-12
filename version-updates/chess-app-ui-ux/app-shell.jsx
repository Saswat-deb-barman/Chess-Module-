/**
 * Reference only — shows how the prototype composes the screens/
 * components in this kit into one app, including the SetupScreen markup
 * (never shipped as its own file in the original bundle) and the bottom
 * nav wiring. Not meant to run as-is: it's plain createElement-free JSX
 * assuming a Babel/React-in-browser environment, uses inline resource
 * fallback paths (assets/icons/*.svg — matching this kit's assets/icons/
 * folder), and a hardcoded demo room code / fake signed-in user.
 *
 * The actual current app's equivalent is src/App.jsx — compare the two
 * to see where this design's IA (bottom nav: Back / Hint / Reset / Chat
 * / Menu-as-history) diverges from the current top-of-screen layout.
 */
const { Button, Piece, BottomNav, Card } = window.ChessForDummiesDesignSystem_aa0fdd;
const R = window.__resources || {};

function Icon({ href, invert }) {
  return <img className="icon" src={href} style={invert ? { filter: "invert(1)" } : undefined} />;
}

function SetupScreen({ topMode, setTopMode, difficulty, setDifficulty, onStart, lobbyScreen, setLobbyScreen, onCreateRoom, roomCode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <Piece type="king" color="w" size={140} basePath="../../" renderSrc={R.pieceKingW} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ margin: 0, font: "var(--text-hero)", color: "var(--text-primary)" }}>Chess</p>
        <p style={{ margin: "2px 0 0", font: "var(--text-caption)", color: "var(--warm-bronze)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase" }}>for Dummies</p>
      </div>

      <div style={{ display: "flex", gap: 8, background: "var(--glass-fill)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-pill)", padding: 4, backdropFilter: "blur(var(--glass-blur))" }}>
        {[["bot", "Play the bot"], ["friend", "Play a friend"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTopMode(key)}
            style={{
              flex: 1, padding: "11px 0", borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer",
              background: topMode === key ? "var(--accent-blue)" : "transparent",
              color: topMode === key ? "var(--text-on-accent)" : "var(--text-secondary)",
              font: "700 0.85rem/1 var(--font-sans)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {topMode === "bot" ? (
        <React.Fragment>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
          <Button variant="primary" onClick={onStart}>Start game</Button>
        </React.Fragment>
      ) : (
        <FriendLobbyScreen screen={lobbyScreen} roomCode={roomCode} onCreate={onCreateRoom} onJoinScreen={() => setLobbyScreen("join")} />
      )}

      <Card variant="glass">
        <h4 style={{ margin: "0 0 6px", font: "var(--text-title)", color: "var(--text-primary)" }}>How to move the King</h4>
        <p style={{ margin: 0, font: "var(--text-body)", color: "var(--text-secondary)" }}>
          The king is the most important piece, but is one of the weakest — it can only move one square in any direction: up, down, sideways, and diagonally.
        </p>
      </Card>
    </div>
  );
}

function App() {
  const [topMode, setTopMode] = React.useState("bot");
  const [difficulty, setDifficulty] = React.useState("medium");
  const [phase, setPhase] = React.useState("setup"); // setup | playing | report | history
  const [lobbyScreen, setLobbyScreen] = React.useState("choose"); // choose | waiting | join
  const [navKey, setNavKey] = React.useState("hint");
  const [user, setUser] = React.useState(null);

  const roomCode = "FFJG66";

  function startGame() { setPhase("playing"); }
  function endGame() { setPhase("report"); }
  function newGame() { setPhase("setup"); setLobbyScreen("choose"); }
  function createRoom() { setLobbyScreen("waiting"); setTimeout(() => setPhase("playing"), 900); }

  let body;
  if (navKey === "menu") {
    body = <GameHistoryScreen />;
  } else if (phase === "setup") {
    body = (
      <SetupScreen
        topMode={topMode} setTopMode={setTopMode}
        difficulty={difficulty} setDifficulty={setDifficulty}
        onStart={startGame}
        lobbyScreen={lobbyScreen} setLobbyScreen={setLobbyScreen}
        onCreateRoom={createRoom} roomCode={roomCode}
      />
    );
  } else if (phase === "playing") {
    body = topMode === "bot" ? <BoardScreen onEnd={endGame} /> : <MultiplayerBoardScreen onEnd={endGame} />;
  } else if (phase === "report") {
    body = <CouncilReportScreen onNewGame={newGame} />;
  }

  return (
    <div className="stage">
      <div style={{ padding: "16px 18px 4px" }}>
        <SignInButton user={user} onSignIn={() => setUser({ name: "Alex Rivera", email: "alex@chessfordummies.app" })} onSignOut={() => setUser(null)} />
      </div>
      <div className="scroll">{body}</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <BottomNav
          activeKey={navKey}
          onSelect={(k) => { if (k === "back") { newGame(); setNavKey("hint"); } else setNavKey(k); }}
          items={[
            { key: "back", label: "Back", icon: <Icon href={R.iconBack || "assets/icons/arrow-left.svg"} invert /> },
            { key: "hint", label: "Hint", icon: <Icon href={R.iconHint || "assets/icons/circle-question-mark.svg"} invert /> },
            { key: "reset", label: "Reset", icon: <Icon href={R.iconReset || "assets/icons/undo-2.svg"} invert /> },
            { key: "chat", label: "Chat", icon: <Icon href={R.iconChat || "assets/icons/message-circle.svg"} invert />, badge: 5 },
            { key: "menu", label: "Menu (history)", icon: <Icon href={R.iconMenu || "assets/icons/menu.svg"} invert /> },
          ]}
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
