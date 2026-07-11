import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth.jsx";
import { listGames, askAboutGame } from "../lib/games.js";

function GameChat({ gameId }) {
  const { idToken, signOut } = useAuth();
  const [messages, setMessages] = useState([]); // { question, answer }
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  async function handleAsk(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setQuestion("");
    const answer = await askAboutGame(idToken, gameId, q, { onUnauthorized: signOut });
    setMessages((prev) => [...prev, { question: q, answer: answer ?? "Couldn't get an answer just now — try again in a moment." }]);
    setAsking(false);
  }

  return (
    <div className="game-chat">
      {messages.map((m, i) => (
        <div key={i} className="game-chat-pair">
          <p className="game-chat-question">{m.question}</p>
          <p className="game-chat-answer">{m.answer}</p>
        </div>
      ))}
      <form className="game-chat-form" onSubmit={handleAsk}>
        <input
          type="text"
          placeholder="Ask a question about this game…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
        />
        <button type="submit" disabled={asking || !question.trim()}>
          {asking ? "…" : "Ask"}
        </button>
      </form>
    </div>
  );
}

// The viewer isn't always White — that was only guaranteed in solo-vs-bot
// mode. In a friend game the viewer could be either color, so "the
// opponent" has to be derived by checking which seat's sub matches the
// signed-in viewer, not assumed to always be game.black.
function opponentLabel(game, viewerSub) {
  if (viewerSub && game.black_google_sub === viewerSub) return game.white;
  return game.black;
}

function GameRow({ game, viewerSub }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="game-history-row">
      <button className="game-history-summary" onClick={() => setExpanded((e) => !e)}>
        <span>
          {new Date(game.played_at).toLocaleDateString()} — vs {opponentLabel(game, viewerSub)}
          <span className="game-history-mode-badge">{game.mode === "friend" ? "friend" : "bot"}</span>
        </span>
        <span className="game-history-result">{game.result}</span>
      </button>
      {expanded && (
        <div className="game-history-detail">
          {game.recap ? (
            <p className="game-history-recap">{game.recap}</p>
          ) : (
            <p className="game-history-recap game-history-recap-empty">No analysis available for this game.</p>
          )}
          <pre className="pgn-box">{game.pgn}</pre>
          <GameChat gameId={game.id} />
        </div>
      )}
    </li>
  );
}

export default function GameHistory({ refreshKey }) {
  const { user, idToken, signOut } = useAuth();
  const [games, setGames] = useState([]);

  useEffect(() => {
    if (!user || !idToken) {
      setGames([]);
      return;
    }
    listGames(idToken, { onUnauthorized: signOut }).then(setGames);
  }, [user, idToken, signOut, refreshKey]);

  if (!user || games.length === 0) return null;

  return (
    <div className="game-history">
      <h3>Match history &amp; analysis</h3>
      <ul>
        {games.map((game) => (
          <GameRow key={game.id} game={game} viewerSub={user.sub} />
        ))}
      </ul>
    </div>
  );
}
