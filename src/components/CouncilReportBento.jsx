import { PATTERN_LABELS } from "../lib/patternLabels.js";
import RibbonBoard from "./analysis/RibbonBoard.jsx";

const PERSONAS = [
  { key: "historian", name: "The Historian" },
  { key: "tacticsTara", name: "Tactics Tara" },
  { key: "strategistSam", name: "Strategist Sam" },
  { key: "endgameEd", name: "Endgame Ed" },
  { key: "coachPriya", name: "Coach Priya" },
];

// "The moment it turned": the game's clearest blunder if one exists,
// otherwise its single largest eval swing in either direction. Exported
// for reuse by the dashboard's improvement-strip drill (opens the same
// "critical moment" on a past game, not a fresh notion of one).
export function pickCriticalMove(definingMoves) {
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
 * Wave 2: the board-hero is now a RibbonBoard — the eval ribbon doubles
 * as navigation (tap a marked moment to scrub), and the board's highlight
 * + caption track whatever ply is currently shown, not a fixed snapshot
 * of the initial critical moment.
 */
export default function CouncilReportBento({ pgn, definingMoves = [], evalTrack, report, loading, patterns = [] }) {
  if (!loading && !report && definingMoves.length === 0) return null;

  const criticalMove = pickCriticalMove(definingMoves);
  const topPattern = patterns[0];

  return (
    <div className="council-bento">
      <h3>Council Report</h3>

      {loading && <p className="council-report-loading">The council is reviewing the game…</p>}

      {criticalMove && pgn && (
        <div className="council-bento-hero">
          <p className="council-bento-hero-cap">The moment it turned</p>
          <RibbonBoard
            pgn={pgn}
            definingMoves={definingMoves}
            evalTrack={evalTrack}
            initialPly={criticalMove.ply - 1}
            mode="beginner"
          />
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
