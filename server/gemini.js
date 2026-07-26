import { GoogleGenAI } from "@google/genai";

const client = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Deliberately isolated from council.js — this file must survive a
// provider swap on its own, so nothing here is imported from or shared
// with the Anthropic-facing module (same "own client, own parser" idiom
// as council.js's own parseJsonLoose, just not the same function).
function parseJsonLoose(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function isValidLiteratureTile(obj) {
  return (
    obj &&
    typeof obj.principle === "string" &&
    obj.principle.trim().length > 0 &&
    typeof obj.plain === "string" &&
    obj.plain.trim().length > 0 &&
    typeof obj.lineage === "string" &&
    obj.lineage.trim().length > 0 &&
    obj.confident === true
  );
}

function formatDefiningMoves(definingMoves = []) {
  if (!definingMoves.length) return "(no notable swings were flagged in this game)";
  return definingMoves
    .map((m) => {
      const label = m.color === "w" ? "White" : "Black";
      const tags = [m.isCastle && "castling", m.isCheckmate && "checkmate"].filter(Boolean).join(", ");
      return `Move ${m.moveNumber} (${label}) ${m.san} — ${m.classification}${tags ? `, ${tags}` : ""}`;
    })
    .join("\n");
}

function buildPrompt({ pgn, definingMoves }) {
  return `You connect one finished chess game to a single named chess principle from the classical literature, in plain language for a beginner.

Game PGN:
${pgn}

An engine already flagged these moves as the game's defining moments:
${formatDefiningMoves(definingMoves)}

Rules, non-negotiable:
- Name a principle, not a citation. "An idea Tarrasch taught" is fine. A fabricated quote, a page number, or a specific book+year is NOT — never invent a quotation.
- Tie the principle to what actually happened in THIS game's flagged moments, not a generic maxim that could apply to any game.
- Plain language only — no algebraic notation, no square coordinates.
- If you cannot connect a real principle to this game's actual moments with genuine confidence, set "confident" to false and leave "principle"/"plain"/"lineage" as empty strings.

Respond with ONLY valid JSON, no markdown fences, matching exactly:
{
  "principle": "a short phrase naming the idea",
  "plain": "2-3 plain-language sentences tying the idea to this specific game",
  "lineage": "a gesture at who taught this, e.g. 'A principle every classic teaches, Tarrasch to Silman.' — never a specific citation",
  "confident": true
}`;
}

/**
 * The "From the literature" tile (COUNCIL_MODULE_SPEC_V1 §5) — a sidecar
 * to getCouncilReport, not a dependency of it. Takes only the engine's
 * own objective definingMoves (the same input council.js gets), never
 * Claude's output, so it can run concurrently with getCouncilReport at
 * both trigger sites with zero ordering requirement. Same fail-soft
 * contract as every function in council.js: resolves to null on missing
 * key, network error, or any output that doesn't validate — never
 * throws, never blocks the report, never renders as an error card.
 */
export async function getLiteratureTile({ pgn, definingMoves = [] }) {
  if (!client || !pgn) return null;
  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-pro",
      contents: buildPrompt({ pgn, definingMoves }),
      config: { temperature: 0.2, maxOutputTokens: 400 },
    });
    const parsed = parseJsonLoose(response.text);
    return isValidLiteratureTile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
