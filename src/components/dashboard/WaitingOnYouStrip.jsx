/**
 * DASHBOARD_SPEC_V1 §2.6 — incoming pending challenges, the other half
 * of the social loop (the thing that pulls a friend back into the app).
 * Sits above/near the rivalries row; simply doesn't render when there's
 * nothing incoming.
 */
export default function WaitingOnYouStrip({ challenges = [], loading, onAccept, onDecline }) {
  if (loading || challenges.length === 0) return null;

  return (
    <div className="waiting-on-you">
      {challenges.map((challenge) => (
        <div key={challenge.id} className="waiting-on-you-card">
          <p className="waiting-on-you-text">
            <strong>{challenge.fromName}</strong> challenged you
            {challenge.timeControl ? ` · ${challenge.timeControl}` : ""}
          </p>
          <div className="waiting-on-you-actions">
            <button className="start-button" onClick={() => onAccept?.(challenge)}>
              Accept
            </button>
            <button className="waiting-on-you-decline" onClick={() => onDecline?.(challenge)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
