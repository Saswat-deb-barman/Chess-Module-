// CM-206: light bg/near-black text for a white move, near-black bg/light
// text for a black move — both carry a thin border, which is what keeps
// the white bubble visible against a light page and the black bubble
// visible against a dark one (without it, one or the other vanishes into
// the surface behind it).
const WHITE_BG = "#f5f3ee";
const WHITE_TEXT = "#1a1a1a";
const BLACK_BG = "#1a1a1a";
const BLACK_TEXT = "#f5f3ee";

function relativeLuminance(hex) {
  const [r, g, b] = hex
    .match(/\w\w/g)
    .map((c) => parseInt(c, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

// Printed once, not per-render — PRD asks for a measured number in the
// transcript, not an opinion, same spirit as useBoardWidth's dev log.
let contrastLogged = false;
function logContrastOnce() {
  if (contrastLogged) return;
  contrastLogged = true;
  const whiteRatio = contrastRatio(WHITE_BG, WHITE_TEXT).toFixed(2);
  const blackRatio = contrastRatio(BLACK_BG, BLACK_TEXT).toFixed(2);
  console.log(
    `[CommentaryBubble] contrast ratios — white-move bubble: ${whiteRatio}:1, black-move bubble: ${blackRatio}:1 (WCAG AA text minimum: 4.5:1)`
  );
}

export default function CommentaryBubble({ side, text, speaker = "The Council", avatar = "♟" }) {
  logContrastOnce();
  return (
    <div className={`commentary-bubble commentary-bubble--${side === "b" ? "black" : "white"}`}>
      <span className="commentary-bubble__avatar" aria-hidden="true">
        {avatar}
      </span>
      <div className="commentary-bubble__body">
        <span className="commentary-bubble__speaker">{speaker}</span>
        <p className="commentary-bubble__text">{text}</p>
      </div>
    </div>
  );
}
