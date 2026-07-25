// CM-206: light bg/near-black text for a white move, near-black bg/light
// text for a black move — both carry a thin border, which is what keeps
// the white bubble visible against a light page and the black bubble
// visible against a dark one (without it, one or the other vanishes into
// the surface behind it). The actual paint is class-based (App.css's
// .commentary-bubble--white/--black); the two colors are read from the
// live token values here, not hardcoded, so this log can never drift
// from App.css the way a second set of hardcoded hex constants would.
function resolveToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

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
  const paper100 = resolveToken("--paper-100");
  const felt950 = resolveToken("--felt-950");
  // Both bubbles use the same two colors swapped (white: paper bg / felt
  // text, black: felt bg / paper text) — one ratio covers both tones.
  const ratio = contrastRatio(paper100, felt950).toFixed(2);
  console.log(`[CommentaryBubble] contrast ratio (both tones, colors swapped): ${ratio}:1 (WCAG AA text minimum: 4.5:1)`);
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
