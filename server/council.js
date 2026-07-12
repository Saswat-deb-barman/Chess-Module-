import Anthropic from "@anthropic-ai/sdk";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const MOMENT_PROMPTS = {
  capture: (san) =>
    `A piece was just captured (move: ${san}). React in one short sentence, under 15 words, like a friend casually watching the game.`,
  check: (san) =>
    `The king is now in check (move: ${san}). React in one short sentence, under 15 words, like a friend casually watching the game.`,
  checkmate: (san) =>
    `Checkmate just happened (move: ${san}). React in one short sentence, under 15 words, like a friend casually watching the game.`,
};

/**
 * Short live reaction to a single notable move. Resolves to null instead of
 * throwing whenever the council can't respond (no key, rate limit, network
 * blip) — the game itself must never block or break on this.
 */
export async function getPing({ moment, san }) {
  if (!client || !MOMENT_PROMPTS[moment]) return null;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 40,
      messages: [{ role: "user", content: MOMENT_PROMPTS[moment](san) }],
    });
    return response.content[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Answers a follow-up question about a specific finished game — "why did
 * I lose the knight on move 12?" etc. Same fail-soft contract as getPing:
 * the chat UI shows a friendly fallback line itself when this is null,
 * so callers don't need special-case handling.
 */
export async function answerQuestion({ pgn, recap, question, askingColor }) {
  if (!client || !pgn || !question) return null;
  try {
    const context = recap ? `\n\nA friend's earlier recap of the game: "${recap}"` : "";
    // Defaults to White for solo-vs-bot callers that don't pass this at
    // all (the human is always White there) — friend-mode games pass the
    // real color so a Black asker doesn't get a prompt that assumes
    // they're White.
    const askerLabel = askingColor === "b" ? "the player who was Black" : "the player who was White";
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Here's a finished chess game in PGN:\n\n${pgn}${context}\n\n${askerLabel} has a question about this game: "${question}"\n\nAnswer helpfully and specifically, referencing actual moves from the PGN where relevant. Keep it conversational — a few sentences unless the question genuinely needs more.`,
        },
      ],
    });
    return response.content[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Fuller post-game recap from the final PGN. Same fail-soft contract as
 * getPing.
 */
export async function getRecap({ pgn }) {
  if (!client || !pgn) return null;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Here's a finished chess game in PGN:\n\n${pgn}\n\nAs a friend who just watched the whole game, give a short, warm 3-5 sentence recap of how it went — no move-by-move recitation, just the story of it.`,
        },
      ],
    });
    return response.content[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// The five coaching personas, same framing Saswat already uses for
// game-by-game analysis outside this app — kept identical on purpose so
// the in-app Council Report reads as the same council, not a different
// voice. The Historian and Endgame Ed are deliberately allowed to say
// "not much to add here" rather than forcing commentary on a game phase
// that didn't really happen (a 15-move miniature has no endgame).
const PERSONA_BRIEF = `You are "The Council" — five distinct chess coaching personas who jointly review one finished game:
- The Historian: opening theory, deviations from known lines, and castling timing (when it happened, or if it never did).
- Tactics Tara: tactical moments — hanging pieces, missed or landed combinations, recapture safety.
- Strategist Sam: positional themes — pawn structure, piece activity, and plans across the middlegame.
- Endgame Ed: endgame technique, including mating technique and stalemate traps. If the game never reached a real endgame, say so briefly instead of forcing a comment.
- Coach Priya: one practical, cross-game takeaway — what to actually work on next, not a recap of the game itself.`;

function formatDefiningMoves(definingMoves = []) {
  if (!definingMoves.length) return "(the engine didn't flag any notable swings in this game)";
  return definingMoves
    .map((m) => {
      const label = m.color === "w" ? "White" : "Black";
      const swingLabel = `${m.swing > 0 ? "+" : ""}${m.swing}cp`;
      const tags = [m.isCheckmate && "delivers checkmate", m.isCastle && "castling"].filter(Boolean).join(", ");
      return `Move ${m.moveNumber} (${label}) ${m.san} — engine classification: ${m.classification}, eval swing ${swingLabel}${tags ? `, ${tags}` : ""}`;
    })
    .join("\n");
}

// Anthropic responses occasionally wrap JSON in a markdown fence even when
// told not to — stripped defensively rather than trusting the instruction
// alone. Returns null (not a throw) on anything unparseable so the report
// endpoint can fail soft exactly like every other council call.
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
 * The full post-game Chess Council report. `definingMoves` comes from the
 * client's own engine analysis (src/lib/gameAnalysis.js) — an objective,
 * engine-scored list of which moves swung the evaluation the most. This
 * function's only job is the qualitative half: giving each persona a turn
 * to narrate specific flagged moves rather than speaking in generalities.
 * Same fail-soft contract as every other function here — resolves to null
 * on missing key, network error, or unparseable output.
 */
export async function getCouncilReport({ pgn, result, definingMoves }) {
  if (!client || !pgn) return null;
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1200,
      // Sonnet 5 defaults to adaptive thinking when `thinking` is omitted,
      // and for this multi-persona JSON prompt it was spending the entire
      // max_tokens budget on thinking before producing any output text at
      // all (stop_reason: "max_tokens", empty content). This is pure
      // narration over data the engine already computed — no reasoning
      // needed — so thinking is disabled outright rather than just
      // enlarging the budget.
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: `${PERSONA_BRIEF}

Here's a finished chess game in PGN (result: ${result ?? "unknown"}):

${pgn}

An engine already flagged these moves as the game's defining moments — these are objective eval swings, not the council's opinion:
${formatDefiningMoves(definingMoves)}

Write the council's post-game report. Each persona should reference specific moves from the game where relevant — especially the flagged ones above — rather than speaking in generalities. Keep each persona's section to 2-4 sentences; Coach Priya's should be 1-2 sentences.

Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "historian": "...",
  "tacticsTara": "...",
  "strategistSam": "...",
  "endgameEd": "...",
  "coachPriya": "...",
  "definingMoveNotes": [
    { "moveNumber": 1, "color": "w", "san": "e4", "caption": "one short sentence, in whichever persona's voice fits best, on why this specific move mattered" }
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
