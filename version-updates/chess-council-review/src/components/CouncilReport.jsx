const CLASSIFICATION_LABEL = {
  blunder: "Blunder",
  mistake: "Mistake",
  inaccuracy: "Inaccuracy",
  excellent: "Excellent",
  normal: "Notable",
};

const PATTERN_LABEL = {
  hangingPiece: "Hanging Piece",
  recaptureSafety: "Recapture Safety",
  castlingTiming: "Castling Timing",
  matingTechnique: "Mating Technique",
  openingTheory: "Opening Theory",
  // "other" is the honest fallback in the schema, not a real category —
  // deliberately not given a label, so it renders as no tag at all
  // rather than a meaningless "Other" badge.
};

// Tactics Tara no longer gets her own paragraph (see server/council.js) —
// her entire contribution is the per-move captions below, which is the
// Insight layer. These three are Knowledge-layer paragraphs; Coach Priya
// is Wisdom.
const KNOWLEDGE_PERSONAS = [
  { key: "historian", name: "The Historian" },
  { key: "strategistSam", name: "Strategist Sam" },
  { key: "endgameEd", name: "Endgame Ed" },
];

function noteFor(move, notes) {
  return notes?.find((n) => n.moveNumber === move.moveNumber && n.color === move.color && n.san === move.san) ?? null;
}

/**
 * `definingMoves` is the engine's objective output (../lib/gameAnalysis.js);
 * `report` is the Council's Knowledge/Insight/Wisdom narration on top of
 * it (server/council.js's getCouncilReport). Either can arrive without
 * the other still being ready, so this renders whatever it currently has
 * rather than waiting for both.
 */
export default function CouncilReport({ definingMoves = [], report, loading }) {
  if (!loading && !report && definingMoves.length === 0) return null;

  return (
    <div className="council-report">
      <h3>Council Report</h3>

      {loading && <p className="council-report-loading">The council is reviewing the game…</p>}

      {definingMoves.length > 0 && (
        <ol className="defining-moves">
          {definingMoves.map((m) => {
            const note = noteFor(m, report?.definingMoveNotes);
            const patternLabel = note?.pattern && PATTERN_LABEL[note.pattern];
            return (
              <li key={m.ply} className={`defining-move defining-move-${m.classification}`}>
                <div className="defining-move-head">
                  <span className="defining-move-tag">{CLASSIFICATION_LABEL[m.classification]}</span>
                  <span className="defining-move-san">
                    {m.moveNumber}
                    {m.color === "w" ? "." : "…"} {m.san}
                  </span>
                  {patternLabel && <span className="defining-move-pattern">{patternLabel}</span>}
                </div>
                {note?.caption && <p className="defining-move-caption">{note.caption}</p>}
              </li>
            );
          })}
        </ol>
      )}

      {report && (
        <div className="council-personas">
          {KNOWLEDGE_PERSONAS.map(({ key, name }) =>
            report[key] ? (
              <div key={key} className="council-persona">
                <h4>{name}</h4>
                <p>{report[key]}</p>
              </div>
            ) : null
          )}
          {report.coachPriya && (
            <div className="council-persona council-persona-wisdom">
              <h4>
                Coach Priya
                {report.coachPriyaPattern && PATTERN_LABEL[report.coachPriyaPattern] && (
                  <span className="defining-move-pattern"> — {PATTERN_LABEL[report.coachPriyaPattern]}</span>
                )}
              </h4>
              <p>{report.coachPriya}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
