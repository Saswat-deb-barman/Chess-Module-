import { useState } from "react";
import { useAuth } from "../../lib/auth.jsx";
import { askCouncil } from "../../lib/councilChat.js";

/**
 * The dashboard's general chess Q&A — not tied to one specific saved
 * game, unlike GameHistory.jsx's inline GameChat (which this mirrors
 * structurally almost exactly, down to the single-shot question/answer
 * shape with no conversation memory sent back to the model). Works for a
 * brand-new user with zero games: the server falls back to a curated
 * example-game library when there's no game history to draw on yet.
 */
export default function TalkToCouncil() {
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
    const answer = await askCouncil(idToken, q, { onUnauthorized: signOut });
    setMessages((prev) => [
      ...prev,
      { question: q, answer: answer ?? "Couldn't get an answer just now — try again in a moment." },
    ]);
    setAsking(false);
  }

  return (
    <div className="talk-to-council">
      <h3 className="talk-to-council-title">Talk to the Council</h3>
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
            placeholder="Ask about an opening, a tactic, anything…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={asking}
          />
          <button type="submit" disabled={asking || !question.trim()}>
            {asking ? "…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
