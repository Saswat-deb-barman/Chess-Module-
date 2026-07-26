const CLAMP_CP = 600;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function markerColor(move) {
  if (move.classification === "excellent") return "var(--hl-good)";
  if (move.classification === "blunder" || move.classification === "mistake") return "var(--hl-danger)";
  return "var(--paper-500)";
}

/**
 * The eval-over-time strip that doubles as navigation (COUNCIL_MODULE_SPEC_V1
 * §2/§3.5) — tapping a marked moment scrubs the board (via `onPlyChange`)
 * rather than this being a plain chart. Pure/presentational; a parent
 * (RibbonBoard) owns `plyIndex`.
 *
 * `evalTrack` is a per-ply continuous curve (new games, W2's plumbing) —
 * absent on older cached rows, which degrades to a flat neutral line with
 * only the sparse `definingMoves` markers still plotted and tappable,
 * never a crash. Raw centipawn numbers only ever render in `mode="advanced"`
 * (hard rule — never in beginner, see COUNCIL_MODULE_SPEC_V1 §3.2).
 */
export default function EvalRibbon({ evalTrack, definingMoves = [], totalPlies, plyIndex, onPlyChange, mode = "beginner" }) {
  if (!totalPlies) return null;

  const width = 100;
  const height = 28;
  const mid = height / 2;
  const xForPly = (ply) => (totalPlies > 1 ? (ply / totalPlies) * width : 0);

  const hasTrack = Array.isArray(evalTrack) && evalTrack.length > 0;
  const points = hasTrack
    ? evalTrack
        .map((p) => {
          const clamped = clamp(p.evalCp, -CLAMP_CP, CLAMP_CP);
          return `${xForPly(p.ply)},${mid - (clamped / CLAMP_CP) * mid}`;
        })
        .join(" ")
    : "";

  return (
    <div className={`eval-ribbon eval-ribbon--${mode}`}>
      <svg
        className="eval-ribbon-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" y1={mid} x2={width} y2={mid} className="eval-ribbon-midline" />
        {hasTrack ? (
          <polyline points={points} className="eval-ribbon-line" fill="none" />
        ) : (
          <line x1="0" y1={mid} x2={width} y2={mid} className="eval-ribbon-flatline" />
        )}
        {definingMoves.map((m) => (
          <rect
            key={m.ply}
            x={xForPly(m.ply - 1) - 1}
            y={0}
            width={2}
            height={height}
            fill={markerColor(m)}
            className="eval-ribbon-marker"
            onClick={() => onPlyChange?.(m.ply - 1)}
          />
        ))}
        <line
          x1={xForPly(plyIndex)}
          y1={0}
          x2={xForPly(plyIndex)}
          y2={height}
          className="eval-ribbon-cursor"
        />
      </svg>
      {mode === "advanced" && (
        <div className="eval-ribbon-legend">
          {definingMoves.map((m) => (
            <button
              key={m.ply}
              type="button"
              className="eval-ribbon-tick-label"
              onClick={() => onPlyChange?.(m.ply - 1)}
            >
              {m.moveNumber}
              {m.color === "w" ? "." : "…"} {m.evalCp > 0 ? "+" : ""}
              {(m.evalCp / 100).toFixed(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
