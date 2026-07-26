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

/**
 * A ranking mode over the same rows `listGames()` already returns — not
 * a SQL-level filter, so `patternTaxonomy.js` stays the single source of
 * truth for what counts as a pattern. Scores blunder count higher than
 * plain pattern-hit count (a game with a real blunder is more worth a
 * second look than one with a mild recurring habit); games with nothing
 * to show are dropped rather than padded in.
 */
export function rankWorthReviewing(games, viewerSub, limit = 5) {
  return games
    .filter(isAnalyzed)
    .map((game) => {
      const patterns = detectPatterns(game, viewerSub);
      const blunderCount = (game.council_report?.definingMoves ?? []).filter(
        (m) => m.classification === "blunder"
      ).length;
      return { game, patterns, blunderCount, score: blunderCount * 2 + patterns.length };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ game, patterns, blunderCount }) => ({ ...game, patterns, blunderCount }));
}

/**
 * Wave 3: rivalries as a derived query, no opponent table — an opponent
 * *is* another user's google_sub, the pairing is just a group-by over
 * `games`. `games` must be `getFriendGames(viewerSub)`'s result (both
 * seats' identities present, newest-first) — not `listGames()`, which
 * caps at 50 and includes solo-bot rows with no real opponent.
 */
export function computeRivalries(games, viewerSub) {
  const byOpponent = new Map();

  for (const game of games) {
    const viewerIsWhite = game.white_google_sub === viewerSub;
    const opponentSub = viewerIsWhite ? game.black_google_sub : game.white_google_sub;

    if (!byOpponent.has(opponentSub)) {
      // `games` is newest-first, so the first game seen per opponent
      // carries the freshest display name and date — never overwritten
      // below, so a later account rename doesn't retroactively relabel it.
      byOpponent.set(opponentSub, {
        opponentSub,
        opponentName: viewerIsWhite ? game.black : game.white,
        lastPlayedAt: game.played_at,
        w: 0,
        l: 0,
        d: 0,
      });
    }

    const entry = byOpponent.get(opponentSub);
    if (game.result === "1-0") entry[viewerIsWhite ? "w" : "l"] += 1;
    else if (game.result === "0-1") entry[viewerIsWhite ? "l" : "w"] += 1;
    else if (game.result === "1/2-1/2") entry.d += 1;
    // Any other result tag (e.g. an unfinished "*") shouldn't reach a
    // `mode='friend'` row from getFriendGames, but stays uncounted rather
    // than crashing if it somehow does.
  }

  const rivalries = [...byOpponent.values()].map(({ opponentSub, opponentName, lastPlayedAt, w, l, d }) => ({
    opponentUserId: opponentSub,
    opponentName,
    record: { w, l, d },
    leader: w > l ? "you" : l > w ? "opponent" : "even",
    lastPlayedAt,
    canChallenge: true,
  }));

  // The rivalry the viewer is *losing* surfaces first (more motivating,
  // per the spec) — then by how established it is (more games), then by
  // recency.
  return rivalries.sort((a, b) => {
    const aLosing = a.leader === "opponent" ? 0 : 1;
    const bLosing = b.leader === "opponent" ? 0 : 1;
    if (aLosing !== bLosing) return aLosing - bLosing;
    const aTotal = a.record.w + a.record.l + a.record.d;
    const bTotal = b.record.w + b.record.l + b.record.d;
    if (aTotal !== bTotal) return bTotal - aTotal;
    return new Date(b.lastPlayedAt) - new Date(a.lastPlayedAt);
  });
}
