const CLASSIFICATION_LABEL = {
  blunder: "Blunder",
  mistake: "Mistake",
  inaccuracy: "Inaccuracy",
  excellent: "Excellent",
  normal: "Notable",
};

const PERSONAS = [
  { key: "historian", name: "The Historian" },
  { key: "tacticsTara", name: "Tactics Tara" },
  { key: "strategistSam", name: "Strategist Sam" },
  { key: "endgameEd", name: "Endgame Ed" },
  { key: "coachPriya", name: "Coach Priya" },
];

function captionFor(move, notes) {
  const note = notes?.find(
    (n) => n.moveNumber === move.moveNumber && n.color === move.color && n.san === move.san
  );
  return note?.caption ?? null;
}

/**
 * The deep post-game breakdown — distinct from the lightweight live-ping
 * CouncilPanel. `definingMoves` is the engine's objective output (src/lib/
 * gameAnalysis.js); `report` is the 5-persona LLM narration on top of it
 * (server/council.js's getCouncilReport). Either can arrive without the
 * other still being ready, so this renders whatever it currently has
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
          {definingMoves.map((m) => (
            <li key={m.ply} className={`defining-move defining-move-${m.classification}`}>
              <div className="defining-move-head">
                <span className="defining-move-tag">{CLASSIFICATION_LABEL[m.classification]}</span>
                <span className="defining-move-san">
                  {m.moveNumber}
                  {m.color === "w" ? "." : "…"} {m.san}
                </span>
              </div>
              {report?.definingMoveNotes && (
                <p className="defining-move-caption">{captionFor(m, report.definingMoveNotes)}</p>
              )}
            </li>
          ))}
        </ol>
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
    </div>
  );
}
