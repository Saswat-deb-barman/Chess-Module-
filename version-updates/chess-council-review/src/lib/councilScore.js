/**
 * The "Council Score" — five deterministic, engine-derived parameters
 * rating one player's performance in one game. This is the first block
 * of the report, on purpose: everything below it is prose (narrated by
 * the LLM), and prose needs an anchor the reader can trust is computed
 * the same way every time. So none of this calls an LLM — it's pure
 * arithmetic over `plies` (src/lib/gameAnalysis.js's per-move output),
 * the same way the reference puzzle-stats card's "Performance %" is
 * clearly a real computed number, not a vibe.
 *
 * The five axes were chosen to mirror the pattern categories Saswat
 * already tracks by hand across games (hanging pieces / recapture safety
 * as a distinct subcategory / castling timing / mating technique &
 * stalemate traps / resilience after a material deficit), so a score
 * here is legible against that existing framework rather than inventing
 * a new one:
 *
 *   1. Calculation        — overall move accuracy (blunders/mistakes, averaged)
 *   2. King Safety         — castling timing + checks endured
 *   3. Material Control     — accuracy specifically ON capture/recapture moves
 *   4. Endgame Technique    — accuracy in the game's final phase
 *   5. Resilience           — recovering from a bad spot vs. squandering a good one
 *
 * Explicitly NOT covered yet: time management (clock data isn't part of
 * a PGN, so it never reaches gameAnalysis.js's `plies` — this needs its
 * own instrumentation before it can become a 6th axis; see the module
 * README).
 */

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Positive-only "how much did this move cost the mover" — swing is
// already signed from the mover's own perspective (see gameAnalysis.js),
// so a good or neutral move (swing >= 0) costs nothing here.
function lossOf(ply) {
  return Math.max(0, -ply.swing);
}

function calculationScore(myMoves) {
  const avgLoss = mean(myMoves.map(lossOf));
  const blunders = myMoves.filter((p) => p.classification === "blunder").length;
  const mistakes = myMoves.filter((p) => p.classification === "mistake").length;
  // Averaging alone lets one disaster hide in a otherwise-clean game —
  // blunders and mistakes get an extra flat penalty on top of the curve
  // specifically so a single game-deciding error still drags the score
  // down even if the other 40 moves were accurate.
  return clamp(100 - avgLoss / 8 - blunders * 10 - mistakes * 4);
}

function kingSafetyScore(myMoves, oppMoves) {
  const castled = myMoves.find((p) => p.isCastle);
  // Move 8 is treated as "on time" (matches Saswat's own tracked
  // observation that his improved games castle around move 4-8);
  // later castling loses a little for every move past that, never
  // castling at all is a flat, heavier penalty rather than an
  // extrapolated one (an infinitely-delayed castle isn't just "very
  // late," it's a different, worse thing — the king never gets out of
  // the center at all).
  const base = castled ? 100 - Math.max(0, castled.moveNumber - 8) * 3 : 45;
  const checksEndured = oppMoves.filter((p) => p.isCheck || p.isCheckmate).length;
  return clamp(base - checksEndured * 5);
}

function materialControlScore(myMoves) {
  // Deliberately narrower than Calculation: only moves that were
  // themselves a capture AND lost ground are counted here — this is the
  // proxy for "recapture safety" specifically (per Saswat's own
  // distinction: a piece lost via a bad recapture is a different failure
  // mode than a quiet move that leaves something hanging, which
  // Calculation already covers). It's a heuristic, not literal square-
  // defense analysis — see the module README for the caveat.
  const captureErrors = myMoves.filter((p) => p.isCapture && p.swing <= -75);
  const severity = mean(captureErrors.map(lossOf));
  return clamp(100 - captureErrors.length * 18 - severity / 12);
}

function endgameTechniqueScore(plies, perspective) {
  if (plies.length < 12) return 70; // too short a game for "endgame" to mean anything — neutral, not penalized
  const endgameSlice = plies.slice(Math.floor(plies.length * 0.66));
  const mine = endgameSlice.filter((p) => p.color === perspective);
  if (!mine.length) return 70;
  return clamp(100 - mean(mine.map(lossOf)) / 6);
}

function resilienceScore(plies, perspective, result) {
  if (!plies.length) return 70;
  const evalForMe = (p) => (perspective === "w" ? p.evalCp : -p.evalCp);
  const evals = plies.map(evalForMe);
  const worst = Math.min(...evals);
  const best = Math.max(...evals);

  const won = result === (perspective === "w" ? "1-0" : "0-1");
  const drew = result === "1/2-1/2";

  // Two symmetric stories worth rewarding/penalizing: recovering from a
  // real deficit (worst was bad, result was still good — this is
  // exactly Saswat's own "Game 15 / Game 12" pattern), and the inverse,
  // squandering a real advantage (best was great, result wasn't a win).
  // Neither extreme occurred = a clean game with nothing to prove either
  // way, which is fine — neutral, not penalized.
  if (worst <= -300 && (won || drew)) {
    const depth = Math.min(1, (-worst - 300) / 700); // 0 at -300cp, 1 at -1000cp or worse
    return clamp(75 + depth * 25);
  }
  if (best >= 300 && !won) {
    const heightLost = Math.min(1, (best - 300) / 700);
    return clamp(60 - heightLost * 40);
  }
  return 70;
}

/**
 * @param {{plies: object[], perspective: "w"|"b", result?: string}} args
 *   `plies` is gameAnalysis.js's per-move output; `perspective` is which
 *   side to score; `result` is the PGN Result tag ("1-0"/"0-1"/"1/2-1/2").
 */
export function computeCouncilScore({ plies, perspective, result }) {
  const myMoves = plies.filter((p) => p.color === perspective);
  const oppMoves = plies.filter((p) => p.color !== perspective);

  const scores = {
    calculation: Math.round(calculationScore(myMoves)),
    kingSafety: Math.round(kingSafetyScore(myMoves, oppMoves)),
    materialControl: Math.round(materialControlScore(myMoves)),
    endgameTechnique: Math.round(endgameTechniqueScore(plies, perspective)),
    resilience: Math.round(resilienceScore(plies, perspective, result)),
  };

  // The pill row underneath the radar chart — real computed numbers,
  // same spirit as the reference screenshot's Played/Performance/
  // Solved%/To Replay row.
  const blunders = myMoves.filter((p) => p.classification === "blunder").length;
  const mistakes = myMoves.filter((p) => p.classification === "mistake").length;
  const castled = myMoves.find((p) => p.isCastle);
  const avgLoss = Math.round(mean(myMoves.map(lossOf)));

  return {
    scores,
    overall: Math.round(mean(Object.values(scores))),
    stats: {
      movesPlayed: myMoves.length,
      blunders,
      mistakes,
      avgCentipawnLoss: avgLoss,
      castledOnMove: castled?.moveNumber ?? null,
    },
  };
}

export const SCORE_LABELS = {
  calculation: "Calculation",
  kingSafety: "King Safety",
  materialControl: "Material Control",
  endgameTechnique: "Endgame Technique",
  resilience: "Resilience",
};
