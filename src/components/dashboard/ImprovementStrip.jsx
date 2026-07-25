import Sparkline from "./Sparkline.jsx";

function trendCopy(trend) {
  if (trend.dir === "flat") return "steady";
  if (trend.pct === null) return trend.dir === "up" ? "new" : "steady";
  const sign = trend.pct > 0 ? "+" : "";
  return `${sign}${trend.pct}% vs ${trend.vsLabel}`;
}

// Up to 3 recurring patterns ranked by how often they've shown up
// recently (server/stats.js). "down" reads as improvement (the pattern
// is fading), "up" as worsening — the color follows that, not raw sign.
export default function ImprovementStrip({ patterns = [], loading, onDrill }) {
  if (loading) return null;
  if (patterns.length === 0) return null;

  return (
    <div className="improvement-strip">
      {patterns.map((pattern) => (
        <div key={pattern.id} className="improvement-card">
          <p className="improvement-card-label">{pattern.label}</p>
          <Sparkline data={pattern.spark} />
          <p className={`improvement-card-trend improvement-card-trend--${pattern.trend.dir}`}>
            {trendCopy(pattern.trend)}
          </p>
          <button className="improvement-card-drill" onClick={() => onDrill?.(pattern)}>
            Review a game
          </button>
        </div>
      ))}
    </div>
  );
}
