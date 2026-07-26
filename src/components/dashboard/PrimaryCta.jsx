import { opponentLabel } from "../GameHistory.jsx";

// Derives the top CTA from the existing games list, no new endpoint.
// Honesty constraint (DASHBOARD_SPEC_V1): there's no persistent invite
// system here — friend mode is ephemeral room codes — so "Rematch
// {name}" opens a fresh FriendLobby share flow, never a claim of
// reconnecting to that specific person automatically.
function derivePrimaryCta(games, viewerSub) {
  const last = games[0];
  if (last?.mode === "friend") {
    return { kind: "friend", label: `Rematch ${opponentLabel(last, viewerSub)}` };
  }
  return { kind: "bot", label: "Play the bot" };
}

export default function PrimaryCta({ games, viewerSub, onPlayBot, onPlayFriend }) {
  const cta = derivePrimaryCta(games, viewerSub);
  const isFriend = cta.kind === "friend";

  return (
    <div className="primary-cta">
      <button className="start-button primary-cta-button" onClick={isFriend ? onPlayFriend : onPlayBot}>
        {cta.label}
      </button>
      {isFriend && <p className="primary-cta-sub">Opens a fresh room link to share — not an automatic reconnect.</p>}
      <button className="primary-cta-secondary" onClick={isFriend ? onPlayBot : onPlayFriend}>
        {isFriend ? "Play the bot instead" : "Play a friend instead"}
      </button>
    </div>
  );
}
