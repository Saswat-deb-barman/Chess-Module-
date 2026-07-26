import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth.jsx";
import { listWorthReviewingGames } from "../../lib/games.js";
import { opponentLabel } from "../GameHistory.jsx";

// A self-contained zone (its own fetch, its own empty state) ranking
// games worth a second look — real blunders and recurring patterns
// first, per server/stats.js's rankWorthReviewing. Plain ranked rows for
// Wave 1; a board thumbnail is a nice-to-have, not required here.
export default function WorthReviewing({ refreshKey, onSelect }) {
  const { user, idToken, signOut } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !idToken) {
      setGames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listWorthReviewingGames(idToken, { onUnauthorized: signOut }).then((rows) => {
      setGames(rows);
      setLoading(false);
    });
  }, [user, idToken, signOut, refreshKey]);

  if (loading || games.length === 0) return null;

  return (
    <div className="worth-reviewing">
      <h3>Worth reviewing</h3>
      <ul>
        {games.map((game) => (
          <li key={game.id} className="worth-reviewing-row">
            <span className="worth-reviewing-meta">
              {new Date(game.played_at).toLocaleDateString()} — vs {opponentLabel(game, user.sub)}
            </span>
            <span className="worth-reviewing-why">
              {game.blunderCount > 0
                ? `${game.blunderCount} blunder${game.blunderCount > 1 ? "s" : ""}`
                : `${game.patterns.length} pattern${game.patterns.length > 1 ? "s" : ""}`}
            </span>
            <button className="worth-reviewing-review" onClick={() => onSelect?.(game)}>
              Review
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
