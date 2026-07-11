import { useState } from "react";
import DifficultySelector from "./components/DifficultySelector.jsx";
import Board from "./components/Board.jsx";
import FriendLobby from "./components/FriendLobby.jsx";
import MultiplayerBoard from "./components/MultiplayerBoard.jsx";
import SignInButton from "./components/SignInButton.jsx";
import GameHistory from "./components/GameHistory.jsx";
import { useAuth } from "./lib/auth.jsx";
import { saveGame, updateGameRecap, updateGameCouncilReport } from "./lib/games.js";

export default function App() {
  const { user, idToken, signOut } = useAuth();
  // A shared room link (?room=CODE) should land straight in the friend
  // flow — FriendLobby's own effect that reads this param never gets a
  // chance to run if this component isn't mounted in the first place.
  const [topMode, setTopMode] = useState(() =>
    new URLSearchParams(window.location.search).has("room") ? "friend" : "bot"
  );
  const [difficulty, setDifficulty] = useState("medium");
  const [gameKey, setGameKey] = useState(0); // bump to force a fresh Board mount
  const [phase, setPhase] = useState("setup"); // "setup" | "playing" | "ended"
  const [result, setResult] = useState(null);
  const [savedGameId, setSavedGameId] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [friendGame, setFriendGame] = useState(null); // { myColor, roomCode } once both players are in

  function startGame() {
    setResult(null);
    setSavedGameId(null);
    setPhase("playing");
  }

  function newGame() {
    setGameKey((k) => k + 1);
    setPhase("setup");
  }

  function handleGameEnd(res) {
    setResult(res);
    setPhase("ended");
    // Saving is opt-in by being signed in — guests can still play freely,
    // they just don't get a history.
    if (user && idToken) {
      saveGame(
        idToken,
        { ...res, whiteGoogleSub: user.sub, whiteGoogleEmail: user.email, mode: "bot" },
        { onUnauthorized: signOut }
      ).then((saved) => {
        if (saved) {
          setSavedGameId(saved.id);
          setHistoryRefreshKey((k) => k + 1);
        }
      });
    }
  }

  // The council recap resolves after the game (and its row) is already
  // saved, so this attaches it as a follow-up update rather than holding
  // up the initial save.
  function handleRecap(recapText) {
    if (savedGameId && user && idToken) {
      updateGameRecap(idToken, savedGameId, recapText, { onUnauthorized: signOut }).then((updated) => {
        if (updated) setHistoryRefreshKey((k) => k + 1);
      });
    }
  }

  // The full Chess Council report resolves later still than the recap —
  // it needs client-side engine analysis to finish first (see Board.jsx's
  // runCouncilAnalysis) — so this is a second, independent follow-up
  // patch, same fire-and-forget shape as handleRecap. `report` can be
  // null (LLM call failed soft); still worth persisting definingMoves
  // alone so the move timeline shows up even without persona narration.
  function handleCouncilReport({ definingMoves, report }) {
    if (savedGameId && user && idToken) {
      updateGameCouncilReport(idToken, savedGameId, { definingMoves, report }, { onUnauthorized: signOut }).then(
        (updated) => {
          if (updated) setHistoryRefreshKey((k) => k + 1);
        }
      );
    }
  }

  return (
    <main className="app">
      <SignInButton />
      <h1>Chess MVP — Phase 1</h1>

      <div className="top-mode-toggle">
        <button
          className={`difficulty-option ${topMode === "bot" ? "active" : ""}`}
          onClick={() => setTopMode("bot")}
        >
          Play the bot
        </button>
        <button
          className={`difficulty-option ${topMode === "friend" ? "active" : ""}`}
          onClick={() => setTopMode("friend")}
        >
          Play a friend
        </button>
      </div>

      {topMode === "bot" && (
        <>
          <DifficultySelector
            value={difficulty}
            onChange={setDifficulty}
            disabled={phase === "playing"}
          />

          {phase === "setup" && (
            <button className="start-button" onClick={startGame}>
              Start game
            </button>
          )}

          {phase !== "setup" && (
            <Board
              key={gameKey}
              difficulty={difficulty}
              onGameEnd={handleGameEnd}
              onRecap={handleRecap}
              onCouncilReport={handleCouncilReport}
            />
          )}

          {phase === "ended" && (
            <div className="post-game">
              <h2>{result?.reason}</h2>
              <button onClick={newGame}>New game</button>
            </div>
          )}
        </>
      )}

      {topMode === "friend" &&
        (friendGame ? (
          <MultiplayerBoard myColor={friendGame.myColor} />
        ) : (
          <FriendLobby onGameStart={setFriendGame} />
        ))}

      <GameHistory refreshKey={historyRefreshKey} />
    </main>
  );
}
