import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { fetchMyStats } from "../lib/stats.js";
import { listGames } from "../lib/games.js";
import TrajectoryHeader from "./dashboard/TrajectoryHeader.jsx";
import ImprovementStrip from "./dashboard/ImprovementStrip.jsx";
import PrimaryCta from "./dashboard/PrimaryCta.jsx";
import WorthReviewing from "./dashboard/WorthReviewing.jsx";
import { pickCriticalMove } from "./CouncilReportBento.jsx";
import ReplayBoard from "./chess/ReplayBoard.jsx";
import GameHistory from "./GameHistory.jsx";

/**
 * The signed-in landing screen (phase: "home") — DASHBOARD_SPEC_V1's
 * new home, replacing the setup screen as the front door for anyone
 * already signed in. Each zone below owns its own fetch and its own
 * loading/empty state (W1-14's "progressive, never blocking" rule) —
 * a slow or failed trajectory fetch must never blank the CTA or Match
 * History underneath it.
 */
export default function Dashboard({ onPlayBot, onPlayFriend, historyRefreshKey }) {
  const { user, idToken, signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [drill, setDrill] = useState(null); // { game, label } | null

  useEffect(() => {
    if (!user || !idToken) {
      setStats(null);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    fetchMyStats(idToken, { onUnauthorized: signOut }).then((data) => {
      setStats(data);
      setStatsLoading(false);
    });
  }, [user, idToken, signOut, historyRefreshKey]);

  // A separate fetch from GameHistory's own — this one exists purely to
  // resolve the improvement strip's drill button to a real game, so it
  // can't be blocked by (or block) the match-history list below.
  useEffect(() => {
    if (!user || !idToken) {
      setGames([]);
      return;
    }
    listGames(idToken, { onUnauthorized: signOut }).then(setGames);
  }, [user, idToken, signOut, historyRefreshKey]);

  function handleDrillPattern(pattern) {
    const match = games.find((g) => g.patterns?.includes(pattern.id));
    if (match) setDrill({ game: match, label: pattern.label });
  }

  function handleReviewGame(game) {
    setDrill({ game, label: "Worth reviewing" });
  }

  const drillCriticalMove = drill
    ? pickCriticalMove(drill.game.council_report?.definingMoves ?? [])
    : null;

  return (
    <div className="dashboard">
      <TrajectoryHeader stats={stats} loading={statsLoading} />
      <ImprovementStrip patterns={stats?.patterns ?? []} loading={statsLoading} onDrill={handleDrillPattern} />
      <WorthReviewing refreshKey={historyRefreshKey} onSelect={handleReviewGame} />

      {drill && (
        <div className="dashboard-drill">
          <div className="dashboard-drill-head">
            <p className="dashboard-drill-title">Reviewing: {drill.label}</p>
            <button className="dashboard-drill-close" onClick={() => setDrill(null)}>
              Close
            </button>
          </div>
          <ReplayBoard
            pgn={drill.game.pgn}
            initialPly={drillCriticalMove ? drillCriticalMove.ply - 1 : undefined}
          />
        </div>
      )}

      <PrimaryCta games={games} viewerSub={user?.sub} onPlayBot={onPlayBot} onPlayFriend={onPlayFriend} />
      <GameHistory refreshKey={historyRefreshKey} />
    </div>
  );
}
