import { opponentLabel, opponentSub } from "../GameHistory.jsx";

// Derives the top CTA from the existing games list plus the caller's
// already-fetched outgoing challenges — no new endpoint beyond what P11
// already needs. Challenge-first (DASHBOARD_SPEC_V1 §2.3's locked
// recommendation): "Rematch {name}" sends a real challenge rather than
// opening an anonymous room-share flow, since there's now a real
// opponent identity to challenge.
function derivePrimaryCta(games, viewerSub, outgoingChallenges) {
  const last = games[0];
  if (last?.mode !== "friend") return { kind: "bot" };

  const sub = opponentSub(last, viewerSub);
  const name = opponentLabel(last, viewerSub);
  const existing = outgoingChallenges.find(
    (c) => c.toUserId === sub && (c.status === "pending" || c.status === "accepted")
  );
  return { kind: "friend", sub, name, existing };
}

export default function PrimaryCta({
  games,
  viewerSub,
  outgoingChallenges = [],
  onPlayBot,
  onPlayFriend,
  onChallenge,
  onJoinRoom,
}) {
  const cta = derivePrimaryCta(games, viewerSub, outgoingChallenges);
  const isFriend = cta.kind === "friend";

  if (isFriend && cta.existing?.status === "accepted") {
    return (
      <div className="primary-cta">
        <button className="start-button primary-cta-button" onClick={() => onJoinRoom?.(cta.existing.roomCode)}>
          {cta.name} accepted — join now
        </button>
        <button className="primary-cta-secondary" onClick={onPlayBot}>
          Play the bot instead
        </button>
      </div>
    );
  }

  if (isFriend && cta.existing?.status === "pending") {
    return (
      <div className="primary-cta">
        <p className="primary-cta-waiting">Waiting on {cta.name}…</p>
        <button className="primary-cta-secondary" onClick={onPlayBot}>
          Play the bot instead
        </button>
      </div>
    );
  }

  return (
    <div className="primary-cta">
      <button
        className="start-button primary-cta-button"
        onClick={isFriend ? () => onChallenge?.(cta.sub, cta.name) : onPlayBot}
      >
        {isFriend ? `Rematch ${cta.name}` : "Play the bot"}
      </button>
      {isFriend && <p className="primary-cta-sub">Sends a challenge — not an automatic reconnect.</p>}
      <button className="primary-cta-secondary" onClick={isFriend ? onPlayBot : onPlayFriend}>
        {isFriend ? "Play the bot instead" : "Play a friend instead"}
      </button>
    </div>
  );
}
