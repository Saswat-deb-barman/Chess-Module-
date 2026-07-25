/**
 * The Green Room's signature element — a small breathing-brass badge,
 * lit for exactly one side at a time, always paired with the existing
 * text label next to it (color is never the only signal). Presentation
 * only: `isActive` is derived by the caller (TurnIndicator.jsx) from
 * the same activeColor/myColor comparison it already used before this
 * existed. Core has no per-player avatar/username data model today, so
 * this shows the side's color letter rather than inventing identity
 * data that doesn't exist yet — see version-updates/chess-app-ui-ux's
 * TurnLamp.jsx/Avatar.jsx for the kit version this is adapted from.
 */
export default function TurnLamp({ label, isActive }) {
  return (
    <span className={`turn-lamp ${isActive ? "turn-lamp--on" : ""}`} aria-hidden="true">
      {label}
    </span>
  );
}
