import { SCORE_LABELS } from "../lib/councilScore.js";

// Hand-rolled SVG radar chart — no chart library dependency, deliberately,
// since this module already keeps its dependency list short. Five axes,
// fixed order, matching councilScore.js's five parameters exactly.
const AXES = ["calculation", "kingSafety", "materialControl", "endgameTechnique", "resilience"];
const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 96;
const RINGS = [0.25, 0.5, 0.75, 1];

function pointFor(index, fraction) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / AXES.length;
  const r = RADIUS * fraction;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

function polygonPoints(fractionForIndex) {
  return AXES.map((_, i) => pointFor(i, fractionForIndex(i)).join(",")).join(" ");
}

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function labelAnchor(x) {
  if (Math.abs(x - CENTER) < 12) return "middle";
  return x > CENTER ? "start" : "end";
}

/**
 * The report's first block. `score` is councilScore.js's
 * computeCouncilScore() output — everything here is a direct readout of
 * that object, no additional logic, so this component can't drift from
 * what was actually computed.
 */
export default function CouncilScore({ score }) {
  if (!score) return null;
  const { scores, overall, stats } = score;
  const problemCount = stats.blunders + stats.mistakes;

  return (
    <div className="council-score-card">
      <h3 className="council-score-title">Council Score</h3>

      <div className="council-score-chart-wrap">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="council-score-svg">
          {RINGS.map((frac) => (
            <polygon key={frac} points={polygonPoints(() => frac)} className="council-score-ring" />
          ))}
          {AXES.map((key, i) => {
            const [x, y] = pointFor(i, 1);
            return <line key={key} x1={CENTER} y1={CENTER} x2={x} y2={y} className="council-score-axis-line" />;
          })}
          <polygon points={polygonPoints((i) => clamp01(scores[AXES[i]] / 100))} className="council-score-data" />
          {AXES.map((key, i) => {
            const [x, y] = pointFor(i, 1.24);
            return (
              <text key={key} x={x} y={y} className="council-score-label" textAnchor={labelAnchor(x)}>
                {SCORE_LABELS[key]}
              </text>
            );
          })}
        </svg>
        <div className="council-score-overall">
          <span className="council-score-overall-number">{overall}</span>
          <span className="council-score-overall-caption">overall</span>
        </div>
      </div>

      <div className="council-score-pills">
        <div className="council-score-pill council-score-pill-neutral">
          <span className="council-score-pill-value">{stats.movesPlayed}</span>
          <span className="council-score-pill-label">Moves</span>
        </div>
        <div className="council-score-pill council-score-pill-gold">
          <span className="council-score-pill-value">{stats.avgCentipawnLoss}</span>
          <span className="council-score-pill-label">Avg. loss (cp)</span>
        </div>
        <div className={`council-score-pill ${problemCount === 0 ? "council-score-pill-green" : "council-score-pill-red"}`}>
          <span className="council-score-pill-value">{problemCount}</span>
          <span className="council-score-pill-label">Blunders + mistakes</span>
        </div>
        <div className="council-score-pill council-score-pill-blue">
          <span className="council-score-pill-value">{stats.castledOnMove ?? "Never"}</span>
          <span className="council-score-pill-label">Castled</span>
        </div>
      </div>
    </div>
  );
}
