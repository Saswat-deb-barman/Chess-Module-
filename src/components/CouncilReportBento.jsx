import { getMoveAtPly } from "../lib/gameLogic.js";
import { PATTERN_LABELS } from "../lib/patternLabels.js";
import ReplayBoard from "./chess/ReplayBoard.jsx";

const PERSONAS = [
  { key: "historian", name: "The Historian" },
  { key: "tacticsTara", name: "Tactics Tara" },
  { key: "strategistSam", name: "Strategist Sam" },
  { key: "endgameEd", name: "Endgame Ed" },
  { key: "coachPriya", name: "Coach Priya" },
];

// "The moment it turned": the game's clearest blunder if one exists,
// otherwise its single largest eval swing in either direction.
function pickCriticalMove(definingMoves) {
  if (!definingMoves.length) return null;
  return (
    definingMoves.find((m) => m.classification === "blunder") ??
    definingMoves.reduce((best, m) => (Math.abs(m.swing) > Math.abs(best.swing) ? m : best), definingMoves[0])
  );
}

/**
 * The post-game report as a beginner-legible bento (COUNCIL_MODULE_SPEC_V1
 * §2-3), Wave 1 scope: top band (board-hero + who-was-winning) + coach
 * tiles + the pattern-hit loop-closer. Reads a cached row, makes zero
 * model calls of its own — same "generated once, cached" contract as
 * the existing CouncilReport. A coach with nothing to say renders no
 * tile (report[key] is JSON null from server/council.js, never padded);
 * this stays a straight port of that same falsy check.
 *
 * Ribbon-as-navigation (tap a marked moment to scrub) is explicitly
 * Wave 2 — this ships with a single fixed critical-moment board plus
 * ReplayBoard's plain scrubber for anyone curious to look further.
 */
export default function CouncilReportBento({ pgn, definingMoves = [], report, loading, patterns = [] }) {
  if (!loading && !report && definingMoves.length === 0) return null;

  const criticalMove = pickCriticalMove(definingMoves);
  const heroMove = criticalMove && pgn ? getMoveAtPly(pgn, criticalMove.ply - 1) : null;
  const topPattern = patterns[0];

  return (
    <div className="council-bento">
      <h3>Council Report</h3>

      {loading && <p className="council-report-loading">The council is reviewing the game…</p>}

      {heroMove && (
        <div className="council-bento-hero">
          <p className="council-bento-hero-cap">The moment it turned</p>
          <ReplayBoard
            pgn={pgn}
            initialPly={criticalMove.ply - 1}
            originSquares={[heroMove.from]}
            targetSquares={[heroMove.to]}
          />
          <p className="council-bento-hero-caption">
            {criticalMove.moveNumber}
            {criticalMove.color === "w" ? "." : "…"} {criticalMove.san}
          </p>
        </div>
      )}

      {report?.whoWasWinning && (
        <div className="council-bento-tile council-bento-winning">
          <p className="council-bento-cap">Who was winning</p>
          <p>{report.whoWasWinning}</p>
        </div>
      )}

      {report && (
        <div className="council-personas">
          {PERSONAS.map(({ key, name }) =>
            report[key] ? (
              <div key={key} className="council-persona">
                <h4>{name}</h4>
                <p>{report[key]}</p>
              </div>
            ) : null
          )}
        </div>
      )}

      {topPattern && (
        <div className="council-bento-tile council-bento-pattern">
          <p className="council-bento-cap">This writes back to your tracker</p>
          <p>{PATTERN_LABELS[topPattern] ?? topPattern}</p>
        </div>
      )}
    </div>
  );
}
