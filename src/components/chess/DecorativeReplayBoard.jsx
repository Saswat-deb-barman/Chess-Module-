import { useEffect, useState } from "react";
import { getPlyCountFromPgn } from "../../lib/gameLogic.js";
import ReplayBoard from "./ReplayBoard.jsx";

// Slow and hypnotic (LOGIN_SPEC_V1 §3.3) — never fast enough to distract
// from the sign-in card.
const PLY_INTERVAL_MS = 2000;

/**
 * The login screen's decorative board — the first real autoplay consumer
 * of ReplayBoard's controlled ply cursor (added for this in Wave 2's
 * ribbon work). Loops a finished PGN forever, one ply at a time.
 *
 * `prefers-reduced-motion: reduce` freezes on a single fixed mid-game
 * position instead of animating — the board is pure decoration, so
 * freezing loses nothing essential (a hard requirement, not a nice-to-have).
 */
export default function DecorativeReplayBoard({ pgn }) {
  const totalPlies = getPlyCountFromPgn(pgn);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [plyIndex, setPlyIndex] = useState(
    prefersReducedMotion ? Math.floor(totalPlies / 2) : 0
  );

  useEffect(() => {
    if (prefersReducedMotion || totalPlies <= 1) return;
    const interval = setInterval(() => {
      setPlyIndex((current) => (current + 1) % totalPlies);
    }, PLY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, totalPlies]);

  return <ReplayBoard pgn={pgn} decorative plyIndex={plyIndex} onPlyChange={() => {}} />;
}
