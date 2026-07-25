import { useEffect, useRef, useState } from "react";
import DifficultySelector from "./components/DifficultySelector.jsx";
import Board from "./components/Board.jsx";
import FriendLobby from "./components/FriendLobby.jsx";
import MultiplayerBoard from "./components/MultiplayerBoard.jsx";
import SignInButton from "./components/SignInButton.jsx";
import GameHistory from "./components/GameHistory.jsx";
import AnalysisModeChooser from "./components/AnalysisModeChooser.jsx";
import Dashboard from "./components/Dashboard.jsx";
import { useAuth } from "./lib/auth.jsx";
import { useAnalysisMode } from "./lib/analysisMode.jsx";
import { saveGame, updateGameRecap, updateGameCouncilReport } from "./lib/games.js";

export default function App() {
  const { user, idToken, signOut, enabled } = useAuth();
  const { mode, loading: modeLoading } = useAnalysisMode();
  // A shared room link (?room=CODE) should land straight in the friend
  // flow — FriendLobby's own effect that reads this param never gets a
  // chance to run if this component isn't mounted in the first place,
  // and it should bypass the dashboard landing below entirely too.
  const hasRoomCode = new URLSearchParams(window.location.search).has("room");
  const [topMode, setTopMode] = useState(() => (hasRoomCode ? "friend" : "bot"));
  const [difficulty, setDifficulty] = useState("medium");
  const [gameKey, setGameKey] = useState(0); // bump to force a fresh Board mount
  // "setup" | "playing" | "ended" | "home". Lazy-initialized to "home"
  // for a returning signed-in user (token already in localStorage) so
  // there's no flash of the setup screen before landing; the effect
  // below catches the "just signed in this session" case the lazy
  // initializer can't see (user was null at mount time).
  const [phase, setPhase] = useState(() => (enabled && user && !hasRoomCode ? "home" : "setup"));
  const [result, setResult] = useState(null);
  const [savedGameId, setSavedGameId] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [friendGame, setFriendGame] = useState(null); // { myColor, roomCode } once both players are in
  const landedOnHomeRef = useRef(phase === "home");

  // Signed-in landing: once auth resolves to a real user (guest-only
  // local dev with auth disabled entirely never engages this — "home"
  // stays unreachable there, same as before this phase existed), land
  // on the dashboard exactly once per session rather than the setup
  // screen. Doesn't re-fire once landed, so navigating away (Play the
  // bot) and back doesn't get yanked back to "home" unexpectedly.
  useEffect(() => {
    if (enabled && user && !hasRoomCode && !landedOnHomeRef.current && phase === "setup") {
      landedOnHomeRef.current = true;
      setPhase("home");
    }
  }, [enabled, user, hasRoomCode, phase]);

  function startGame() {
    setResult(null);
    setSavedGameId(null);
    setPhase("playing");
  }

  function newGame() {
    setGameKey((k) => k + 1);
    setPhase(enabled && user ? "home" : "setup");
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

  // CM-208: no guest play once sign-in is actually configured — signed
  // out sees only the door in, not the app behind it. When auth itself
  // isn't configured (enabled: false, e.g. local dev without
  // VITE_GOOGLE_CLIENT_ID), the app keeps behaving exactly as it always
  // has: guest-only, no gate, since there's nothing to sign in *to*.
  const canPlay = !enabled || user;

  // The onboarding mode chooser only applies when real auth is
  // configured and someone is actually signed in — guest-only local
  // dev (auth disabled entirely) skips it and falls back to whatever
  // default the eventual beginner-mode consumer applies (mode ?? "beginner").
  const modeGateLoading = enabled && user && modeLoading;
  const showModeChooser = enabled && user && !modeLoading && mode === null;

  return (
    <main className="app">
      <SignInButton />
      <h1>Chess by Alchemist</h1>

      {!canPlay ? (
        <p className="landing-message">Sign in with Google to play.</p>
      ) : modeGateLoading ? null : showModeChooser ? (
        <AnalysisModeChooser />
      ) : phase === "home" ? (
        <Dashboard
          onPlayBot={() => {
            setTopMode("bot");
            setPhase("setup");
          }}
          onPlayFriend={() => {
            setTopMode("friend");
            setPhase("setup");
          }}
          historyRefreshKey={historyRefreshKey}
        />
      ) : (
        <>
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
                  <button className="start-button" onClick={newGame}>
                    New game
                  </button>
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
        </>
      )}
    </main>
  );
}
