import GameHistory from "./GameHistory.jsx";

/**
 * The signed-in landing screen (phase: "home") — DASHBOARD_SPEC_V1's
 * new home, replacing the setup screen as the front door for anyone
 * already signed in. Wave 1 scope for this file: the navigation
 * skeleton, plus keeping Match History reachable here (it used to live
 * below the setup screen, which is no longer the first thing a signed-
 * in user sees). Trajectory header, improvement strip, the
 * context-aware primary CTA, and worth-reviewing all land here in
 * later phases of this same cycle — each zone renders independently
 * once it exists, per the spec's "progressive, never blocking" rule.
 */
export default function Dashboard({ onPlayBot, onPlayFriend, historyRefreshKey }) {
  return (
    <div className="dashboard">
      <div className="cta-row">
        <button className="start-button" onClick={onPlayBot}>
          Play the bot
        </button>
        <button className="flip-button" onClick={onPlayFriend}>
          Play a friend
        </button>
      </div>
      <GameHistory refreshKey={historyRefreshKey} />
    </div>
  );
}
