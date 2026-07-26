import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { fetchMyStats } from "../lib/stats.js";
import { fetchRivalries } from "../lib/rivalries.js";
import { listChallenges, createChallenge, acceptChallenge, declineChallenge } from "../lib/challenges.js";
import { listGames } from "../lib/games.js";
import LearnAboutChess from "./dashboard/LearnAboutChess.jsx";
import TalkToCouncil from "./dashboard/TalkToCouncil.jsx";
import TrajectoryHeader from "./dashboard/TrajectoryHeader.jsx";
import ImprovementStrip from "./dashboard/ImprovementStrip.jsx";
import WorthReviewing from "./dashboard/WorthReviewing.jsx";
import RivalriesRow from "./dashboard/RivalriesRow.jsx";
import PrimaryCta from "./dashboard/PrimaryCta.jsx";
import WaitingOnYouStrip from "./dashboard/WaitingOnYouStrip.jsx";
import { pickCriticalMove } from "./CouncilReportBento.jsx";
import RibbonBoard from "./analysis/RibbonBoard.jsx";
import GameHistory from "./GameHistory.jsx";

// How often to re-check outgoing challenges while one is still pending —
// only to notice an acceptance; stops polling once nothing's waiting.
const OUTGOING_POLL_MS = 20000;

/**
 * The signed-in landing screen (phase: "home") — a learn/play split
 * rather than the original flat zone list, so the dashboard isn't
 * "boring" for a brand-new user before there's any game history yet
 * (LearnAboutChess, TalkToCouncil work identically for a 0-game and a
 * 500-game user, no fetch, no auth-gated data). The data-driven zones
 * from the original build (trajectory, patterns, rivalries, worth
 * reviewing) were never actually removed server-side — their endpoints
 * (/me/stats, /me/rivalries) were kept alive dormant specifically so
 * they could come back once there's enough history to make them worth
 * looking at. Restored here: trajectory/improvement/worth-reviewing feed
 * "Learn" (self-improvement feedback), rivalries feeds "Play" (it's a
 * social/functional prompt — "challenge someone you already play"), same
 * split logic as the section's own boundary.
 */
export default function Dashboard({ onPlayBot, onPlayFriend, onEnterRoom, historyRefreshKey }) {
  const { user, idToken, signOut } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [rivalries, setRivalries] = useState([]);
  const [rivalriesLoading, setRivalriesLoading] = useState(true);
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [outgoingChallenges, setOutgoingChallenges] = useState([]);
  const outgoingRef = useRef([]);
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

  // Its own independent zone (Wave 1's "every zone owns its state" rule)
  // — a slow/failed rivalries fetch must never block the CTA or history.
  useEffect(() => {
    if (!user || !idToken) {
      setRivalries([]);
      setRivalriesLoading(false);
      return;
    }
    setRivalriesLoading(true);
    fetchRivalries(idToken, { onUnauthorized: signOut }).then((data) => {
      setRivalries(data);
      setRivalriesLoading(false);
    });
  }, [user, idToken, signOut, historyRefreshKey]);

  // Backs PrimaryCta's "Rematch {name}" detection (games[0]) — a separate
  // fetch from GameHistory's own so a slow/failed one can't block either.
  useEffect(() => {
    if (!user || !idToken) {
      setGames([]);
      return;
    }
    listGames(idToken, { onUnauthorized: signOut }).then(setGames);
  }, [user, idToken, signOut, historyRefreshKey]);

  // Incoming challenges — its own independent zone, refreshed the same
  // way every other zone is (on mount / when historyRefreshKey bumps).
  useEffect(() => {
    if (!user || !idToken) {
      setIncomingChallenges([]);
      setIncomingLoading(false);
      return;
    }
    setIncomingLoading(true);
    listChallenges(idToken, "incoming", { onUnauthorized: signOut }).then((data) => {
      setIncomingChallenges(data);
      setIncomingLoading(false);
    });
  }, [user, idToken, signOut, historyRefreshKey]);

  // Outgoing challenges back the CTA's "waiting on {name}" / "join now"
  // states. Polled (not pushed — the dashboard holds no live socket)
  // only while something is still pending, purely to notice the moment
  // the challenged friend accepts.
  useEffect(() => {
    if (!user || !idToken) {
      setOutgoingChallenges([]);
      outgoingRef.current = [];
      return;
    }
    let cancelled = false;
    async function fetchOutgoing() {
      const data = await listChallenges(idToken, "outgoing", { onUnauthorized: signOut });
      if (cancelled) return;
      setOutgoingChallenges(data);
      outgoingRef.current = data;
    }
    fetchOutgoing();
    const interval = setInterval(() => {
      if (outgoingRef.current.some((c) => c.status === "pending")) fetchOutgoing();
    }, OUTGOING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, idToken, signOut, historyRefreshKey]);

  function handleChallenge(toGoogleSub) {
    createChallenge(idToken, { toGoogleSub }, { onUnauthorized: signOut }).then((created) => {
      if (created) {
        const next = [created, ...outgoingRef.current];
        outgoingRef.current = next;
        setOutgoingChallenges(next);
      }
    });
  }

  function handleAcceptChallenge(challenge) {
    acceptChallenge(idToken, challenge.id, { onUnauthorized: signOut }).then((updated) => {
      if (!updated) return;
      setIncomingChallenges((prev) => prev.filter((c) => c.id !== challenge.id));
      if (updated.roomCode) onEnterRoom?.(updated.roomCode);
    });
  }

  function handleDeclineChallenge(challenge) {
    declineChallenge(idToken, challenge.id, { onUnauthorized: signOut }).then(() => {
      setIncomingChallenges((prev) => prev.filter((c) => c.id !== challenge.id));
    });
  }

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
      <section className="dashboard-section dashboard-section--learn">
        <h2 className="dashboard-section-label">Learn</h2>
        <TrajectoryHeader stats={stats} loading={statsLoading} />
        <LearnAboutChess />
        <TalkToCouncil />
        <ImprovementStrip patterns={stats?.patterns ?? []} loading={statsLoading} onDrill={handleDrillPattern} />
        <WorthReviewing refreshKey={historyRefreshKey} onSelect={handleReviewGame} />
      </section>

      <section className="dashboard-section dashboard-section--play">
        <h2 className="dashboard-section-label">Play</h2>
        <WaitingOnYouStrip
          challenges={incomingChallenges}
          loading={incomingLoading}
          onAccept={handleAcceptChallenge}
          onDecline={handleDeclineChallenge}
        />
        <RivalriesRow
          rivalries={rivalries}
          loading={rivalriesLoading}
          onInviteFriend={onPlayFriend}
          onChallenge={(rivalry) => handleChallenge(rivalry.opponentUserId)}
        />
        <PrimaryCta
          games={games}
          viewerSub={user?.sub}
          outgoingChallenges={outgoingChallenges}
          onPlayBot={onPlayBot}
          onPlayFriend={onPlayFriend}
          onChallenge={handleChallenge}
          onJoinRoom={onEnterRoom}
        />
        <GameHistory refreshKey={historyRefreshKey} />
      </section>

      {drill && (
        <div className="dashboard-drill">
          <div className="dashboard-drill-head">
            <p className="dashboard-drill-title">Reviewing: {drill.label}</p>
            <button className="dashboard-drill-close" onClick={() => setDrill(null)}>
              Close
            </button>
          </div>
          <RibbonBoard
            pgn={drill.game.pgn}
            definingMoves={drill.game.council_report?.definingMoves ?? []}
            evalTrack={drill.game.council_report?.evalTrack}
            initialPly={drillCriticalMove ? drillCriticalMove.ply - 1 : undefined}
            mode="beginner"
          />
        </div>
      )}
    </div>
  );
}
