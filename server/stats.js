import { PATTERNS, detectPatterns } from "./patternTaxonomy.js";

const MIN_GAMES_FOR_TRAJECTORY = 3;
const WINDOW_SIZE = 10;

function isAnalyzed(game) {
  return Boolean(game.council_report?.definingMoves?.length);
}

/**
 * GET /me/stats' full response — pure aggregate over already-classified
 * game rows, no new schema, no model calls. `games` must already be
 * sorted newest-first (listGames()'s own order).
 */
export function computeMyStats(games, viewerSub) {
  const analyzed = games.filter(isAnalyzed);

  if (analyzed.length < MIN_GAMES_FOR_TRAJECTORY) {
    return {
      gamesAnalyzed: analyzed.length,
      trajectory: { kind: "onboarding" },
      patterns: [],
    };
  }

  const window = analyzed.slice(0, Math.min(WINDOW_SIZE, analyzed.length));
  // Oldest -> newest, matching the sparkline's expected reading order.
  const chronological = [...window].reverse();

  const perPattern = Object.keys(PATTERNS).map((id) => {
    const hits = chronological.map((game) => (detectPatterns(game, viewerSub).includes(id) ? 1 : 0));
    const countRecent = hits.reduce((sum, h) => sum + h, 0);

    const mid = Math.floor(hits.length / 2);
    const earlyHalf = hits.slice(0, mid);
    const lateHalf = hits.slice(mid);
    const earlyRate = earlyHalf.length ? earlyHalf.reduce((s, h) => s + h, 0) / earlyHalf.length : 0;
    const lateRate = lateHalf.length ? lateHalf.reduce((s, h) => s + h, 0) / lateHalf.length : 0;

    let trend;
    if (earlyRate === 0 && lateRate === 0) {
      trend = { dir: "flat", pct: 0, vsLabel: "wk 1" };
    } else if (earlyRate === 0) {
      trend = { dir: "up", pct: null, vsLabel: "new pattern" };
    } else {
      const pct = Math.round(((lateRate - earlyRate) / earlyRate) * 100);
      trend = { dir: pct < 0 ? "down" : pct > 0 ? "up" : "flat", pct, vsLabel: "wk 1" };
    }

    return {
      id,
      label: PATTERNS[id].label,
      countRecent,
      window: chronological.length,
      trend,
      spark: hits,
      drillable: true,
    };
  });

  const patterns = perPattern
    .filter((p) => p.countRecent > 0)
    .sort((a, b) => b.countRecent - a.countRecent)
    .slice(0, 3);

  // The win to celebrate: the most-improved pattern with a real
  // downward trend (an actual number to point to, not a flat/new one).
  const win = perPattern
    .filter((p) => p.trend.dir === "down" && p.trend.pct !== null)
    .sort((a, b) => a.trend.pct - b.trend.pct)[0];

  // The live target: the worst-ranked pattern that isn't already the win.
  const target = patterns.find((p) => p.id !== win?.id) ?? patterns[0];

  const winPart = win ? `Your ${win.label.toLowerCase()} are down ${Math.abs(win.trend.pct)}% since week one` : null;
  const targetPart = target ? `${winPart ? "but " : ""}${target.label.toLowerCase()} ${winPart ? "still costs you" : "is worth a look"}` : null;
  const sentence =
    winPart && targetPart
      ? `${analyzed.length} games in. ${winPart} — ${targetPart}.`
      : targetPart
        ? `${analyzed.length} games in. ${targetPart[0].toUpperCase()}${targetPart.slice(1)}.`
        : `${analyzed.length} games in — clean recent history, nothing recurring yet.`;

  return {
    gamesAnalyzed: analyzed.length,
    trajectory: {
      kind: "progress",
      sentence,
      win: win ? { pattern: win.id, label: win.label, changePct: win.trend.pct, sinceLabel: "week one" } : null,
      target: target ? { pattern: target.id, label: target.label } : null,
    },
    patterns,
  };
}
