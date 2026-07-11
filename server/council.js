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
