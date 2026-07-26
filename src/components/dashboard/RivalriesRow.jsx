function initial(name) {
  return name?.trim()?.[0]?.toUpperCase() ?? "?";
}

// The server's `leader` enum already encodes who's ahead — this just
// templates the record into a sentence, never re-derives "who's winning"
// client-side.
function leaderLine({ record, leader, opponentName }) {
  const score = `${record.w}-${record.l}${record.d ? `-${record.d}` : ""}`;
  if (leader === "you") return `You're ahead ${score}`;
  if (leader === "opponent") return `${opponentName} leads ${record.l}-${record.w}${record.d ? `-${record.d}` : ""}`;
  return `Even at ${score}`;
}

/**
 * DASHBOARD_SPEC_V1 §2.5 — per-opponent head-to-head cards, sorted
 * server-side (the rivalry you're losing surfaces first). Empty state is
 * the cold-start "Invite a friend" card, reusing the existing ad hoc
 * room-share flow (onInviteFriend) rather than a new invite mechanism —
 * this row is literally where a friend-group's rivalries would be, so
 * it's the right home for that nudge.
 */
export default function RivalriesRow({ rivalries = [], loading, onChallenge, onInviteFriend }) {
  if (loading) return null;

  if (rivalries.length === 0) {
    return (
      <div className="rivalries-row">
        <h3>Rivalries</h3>
        <div className="rivalries-invite-card">
          <p>No friend games yet — invite someone and start a rivalry.</p>
          <button className="start-button" onClick={onInviteFriend}>
            Invite a friend
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rivalries-row">
      <h3>Rivalries</h3>
      <ul className="rivalries-list">
        {rivalries.map((rivalry) => (
          <li key={rivalry.opponentUserId} className="rivalry-card">
            <span className="rivalry-avatar">{initial(rivalry.opponentName)}</span>
            <div className="rivalry-info">
              <p className="rivalry-name">{rivalry.opponentName}</p>
              <p className={`rivalry-leader rivalry-leader--${rivalry.leader}`}>{leaderLine(rivalry)}</p>
            </div>
            <button className="rivalry-challenge" onClick={() => onChallenge?.(rivalry)}>
              Challenge
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
