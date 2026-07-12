import Anthropic from "@anthropic-ai/sdk";
import { buildStyleAnchor } from "./phraseLibrary.js";

// Self-contained copy of chess-mvp core's server/council.js#getCouncilReport
// (not imported from there — this module has to build and deploy on its
// own).
//
// Restructured around the DIKW ladder from the reference article (Data ->
// Information -> Knowledge -> Insight -> Wisdom) rather than five parallel
// voices each doing their own generic pass:
//   - The Historian / Strategist Sam / Endgame Ed own KNOWLEDGE — explaining
//     the mechanism behind a phase of the game, in their domain.
//   - Tactics Tara owns INSIGHT specifically — the per-flagged-move
//     captions, replacing what used to be a bare classification badge with
//     an actual "why this moment mattered right now."
//   - Coach Priya owns WISDOM — one cross-game, practical takeaway, tagged
//     to a named pattern where one applies.
// Data (the raw eval swings) and Information (which square, which piece)
// are already handled upstream by gameAnalysis.js — this function's job
// starts at Knowledge and above.
const PERSONA_BRIEF = `You are "The Council" — chess coaches who jointly review one finished game, each owning a different rung of understanding rather than repeating each other:
- The Historian (Knowledge): opening theory, deviations from known lines, and castling timing (when it happened, or if it never did) — the mechanism behind the opening/early-middlegame decisions.
- Tactics Tara (Insight): explains, for each flagged move specifically, why that exact moment mattered — not what happened (the engine already said that), but the concrete reason it changed the game.
- Strategist Sam (Knowledge): positional themes — pawn structure, piece activity, and plans across the middlegame.
- Endgame Ed (Knowledge): endgame technique, including mating technique and stalemate traps. If the game never reached a real endgame, say so briefly instead of forcing a comment.
- Coach Priya (Wisdom): one practical, cross-game takeaway tied to a named pattern — what to actually work on next, not a recap of the game itself.`;

// The five pattern categories Saswat already tracks by hand across games
// outside this app — kept identical on purpose so a tag here means the
// same thing it would in his own notes. "other" is the honest fallback
// for anything real that doesn't fit; time management is deliberately
// absent — a PGN carries no clock data, so nothing here can honestly
// claim that category (see the module README).
const PATTERN_CATEGORIES = ["hangingPiece", "recaptureSafety", "castlingTiming", "matingTechnique", "openingTheory", "other"];

function formatDefiningMoves(definingMoves = []) {
  if (!definingMoves.length) return "(the engine didn't flag any notable swings in this game)";
  return definingMoves
    .map((m) => {
      const label = m.color === "w" ? "White" : "Black";
      const swingLabel = `${m.swing > 0 ? "+" : ""}${m.swing}cp`;
      const tags = [m.isCheckmate && "delivers checkmate", m.isCastle && "castling", m.isCapture && "capture"]
        .filter(Boolean)
        .join(", ");
      return `Move ${m.moveNumber} (${label}) ${m.san} — engine classification: ${m.classification}, eval swing ${swingLabel}${tags ? `, ${tags}` : ""}`;
    })
    .join("\n");
}

// Anthropic responses occasionally wrap JSON in a markdown fence even when
// told not to — stripped defensively rather than trusting the instruction
// alone. Returns null (not a throw) on anything unparseable.
function parseJsonLoose(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * The full Council report. `definingMoves` comes from the client's own
 * engine analysis (src/lib/gameAnalysis.js) — an objective, engine-scored
 * list of which moves swung the evaluation the most. This function's only
 * job is everything from Knowledge upward: explaining mechanism (Knowledge),
 * the immediate consequence of each flagged move (Insight, via Tactics
 * Tara's captions), and the cross-game takeaway (Wisdom, via Coach Priya).
 * Fail-soft: resolves to null on missing key, network error, or
 * unparseable output — never throws, so the review UI can always fall
 * back to showing just the engine's defining-moves list and Council Score
 * (both computed with no LLM involved at all).
 */
export async function getCouncilReport({ pgn, result, definingMoves }) {
  if (!client || !pgn) return null;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1400,
      // Sonnet 5 defaults to adaptive thinking when `thinking` is omitted,
      // and for this JSON-shaped narration prompt it was spending the
      // entire max_tokens budget on thinking before producing any output
      // text at all (stop_reason: "max_tokens", empty content). This is
      // narration over data the engine already computed, not a reasoning
      // task — thinking is disabled outright rather than just enlarging
      // the budget.
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: `${PERSONA_BRIEF}

${buildStyleAnchor()}

Here's a finished chess game in PGN (result: ${result ?? "unknown"}):

${pgn}

An engine already flagged these moves as the game's defining moments — these are objective eval swings, not the council's opinion:
${formatDefiningMoves(definingMoves)}

Write the council's post-game report, following the voice principles above exactly — no restating what already happened, no praise or blame without a mechanism attached. Each Knowledge-layer persona (Historian, Strategist Sam, Endgame Ed) should reference specific moves where relevant rather than speaking in generalities; keep each to 2-4 sentences. Tactics Tara does not get her own paragraph — her work is entirely the per-move captions below. Coach Priya's takeaway should be 1-2 sentences and must name one of these patterns if it genuinely applies: ${PATTERN_CATEGORIES.join(", ")}.

Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "historian": "...",
  "strategistSam": "...",
  "endgameEd": "...",
  "coachPriya": "...",
  "coachPriyaPattern": "one of: ${PATTERN_CATEGORIES.join(", ")}",
  "definingMoveNotes": [
    {
      "moveNumber": 1,
      "color": "w",
      "san": "e4",
      "pattern": "one of: ${PATTERN_CATEGORIES.join(", ")}",
      "caption": "Tactics Tara's Insight-layer explanation — the mechanism plus the immediate consequence, one to two sentences, following the voice principles above. Not a restatement of the move."
    }
  ]
}
definingMoveNotes must have exactly one entry per flagged move listed above, in the same order.`,
        },
      ],
    });
    const text = response.content[0]?.text?.trim();
    return parseJsonLoose(text);
  } catch {
    return null;
  }
}
