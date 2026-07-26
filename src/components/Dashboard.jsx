import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { listChallenges, createChallenge, acceptChallenge, declineChallenge } from "../lib/challenges.js";
import { listGames } from "../lib/games.js";
import LearnAboutChess from "./dashboard/LearnAboutChess.jsx";
import TalkToCouncil from "./dashboard/TalkToCouncil.jsx";
import PrimaryCta from "./dashboard/PrimaryCta.jsx";
import WaitingOnYouStrip from "./dashboard/WaitingOnYouStrip.jsx";
import GameHistory from "./GameHistory.jsx";

// How often to re-check outgoing challenges while one is still pending —
// only to notice an acceptance; stops polling once nothing's waiting.
const OUTGOING_POLL_MS = 20000;

/**
 * The signed-in landing screen (phase: "home") — rewritten as a
 * learn/play split rather than the previous data-driven zone list
 * (trajectory, patterns, rivalries, worth-reviewing), which read as
 * "boring" for anyone without enough game history yet. The "learn"
 * section (LearnAboutChess, TalkToCouncil) works identically for a
 * brand-new user and a veteran — no fetch, no auth-gated data — while
 * "play" stays the functional half: start a game, see any pending
 * challenge, browse history (fine to be empty).
 */
export default function Dashboard({ onPlayBot, onPlayFriend, onEnterRoom, historyRefreshKey }) {
  const { user, idToken, signOut } = useAuth();
  const [games, setGames] = useState([]);
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [outgoingChallenges, setOutgoingChallenges] = useState([]);
  const outgoingRef = useRef([]);

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

  return (
    <div className="dashboard">
      <section className="dashboard-section dashboard-section--learn">
        <h2 className="dashboard-section-label">Learn</h2>
        <LearnAboutChess />
        <TalkToCouncil />
      </section>

      <section className="dashboard-section dashboard-section--play">
        <h2 className="dashboard-section-label">Play</h2>
        <WaitingOnYouStrip
          challenges={incomingChallenges}
          loading={incomingLoading}
          onAccept={handleAcceptChallenge}
          onDecline={handleDeclineChallenge}
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
    </div>
  );
}
