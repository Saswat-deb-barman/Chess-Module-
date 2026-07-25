/**
 * CM-202: mirrors Clock.jsx's clock-pair pattern exactly — derives which
 * side is "active" straight from `activeColor` (chess.js's own
 * game.turn()), no parallel React state to desync. Black-then-White
 * order matches Clock.jsx's layout.
 */
export default function TurnIndicator({ activeColor, myColor, opponentLabel = "opponent", isOpponentThinking = false }) {
  const myText = activeColor === myColor ? "Your move" : "You";
  const opponentText =
    activeColor !== myColor
      ? isOpponentThinking
        ? "Thinking…"
        : `Waiting for ${opponentLabel}`
      : opponentLabel;

  const blackText = myColor === "b" ? myText : opponentText;
  const whiteText = myColor === "w" ? myText : opponentText;

  return (
    <div className="turn-indicator-pair">
      <span className={`turn-indicator ${activeColor === "b" ? "turn-indicator--active" : ""}`}>
        {blackText}
      </span>
      <span className={`turn-indicator ${activeColor === "w" ? "turn-indicator--active" : ""}`}>
        {whiteText}
      </span>
    </div>
  );
}
