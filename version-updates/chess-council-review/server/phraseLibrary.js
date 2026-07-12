/**
 * Server-side copy of ../src/lib/phraseLibrary.js — duplicated rather
 * than imported across the frontend/server boundary on purpose, same
 * reasoning as council.js and gameAnalysis.js already being separate
 * copies in this module: frontend and server are independent deploy
 * targets (see README), so nothing on one side reaches into the other's
 * folder at runtime. Keep both copies in sync by hand when the voice
 * changes — see the frontend copy for the full rationale and the DIKW
 * framing this is built around.
 */

export const VOICE_PRINCIPLES = [
  "State the mechanism, not the emotion. 'The rook was undefended on d6' beats 'that's gonna hurt.'",
  "Every claim should be traceable to something concrete in the game — a square, a piece, a move number.",
  "It's fine to sit with ambiguity. Not every position has a clean verdict; say so instead of forcing one.",
  "Connect cause to effect explicitly, usually with 'which means,' 'because,' or 'so that' rather than leaving the reader to infer it.",
  "Address the player directly and plainly — 'you' — without theatrics.",
  "A sentence that would read the same if you swapped in a different game is not doing its job. Cut it.",
];

export const AVOID = [
  "Exclamation points as a substitute for content (\"Ouch!\", \"Oh snap!\", \"Whoa!\")",
  "Restating the raw event with no added reasoning (\"you just lost a piece!\")",
  "Faux-casual filler (\"that's gonna hurt\", \"nice capture!\", \"tough spot\")",
  "Generic praise or blame with no mechanism attached (\"good move\", \"bad move\", \"mistake\")",
  "Hedging language that adds no information (\"kind of\", \"sort of\", \"a bit\") unless the position is genuinely ambiguous",
];

export const WORKED_EXAMPLES = [
  {
    layer: "insight",
    text: "White's rook lands on d6 attacking the bishop, but the point of the whole sequence starting two moves earlier was always this square — the sacrifice on move 18 only pays for itself if this recapture happens.",
  },
  {
    layer: "insight",
    text: "The pawn push g4 ignores that the queen on e5 was already looking straight at the rook on d6 — not a subtle tactic, just an undefended piece on an open diagonal, and Black takes it back immediately.",
  },
  {
    layer: "knowledge",
    text: "Black's rook shuffles from g8 to h8 and back cost two full moves without changing the position — and they're the same two moves that would have been spent castling, which is why the king is still on e8 fifteen moves later when the position opens up.",
  },
  {
    layer: "wisdom",
    text: "The pattern worth naming here isn't 'blundered a rook' in isolation — it's moving a piece into a square already covered by an active knight without checking what that knight sees. That's a five-second habit to build, not a calculation problem.",
  },
];

/**
 * Formats the library into a single prompt-injectable block. Kept short
 * on purpose — a wall of examples tends to make the model copy phrasing
 * verbatim rather than internalize the register.
 */
export function buildStyleAnchor({ exampleCount = 2 } = {}) {
  const examples = WORKED_EXAMPLES.slice(0, exampleCount)
    .map((e) => `  (${e.layer}) "${e.text}"`)
    .join("\n");

  return `Voice principles:
${VOICE_PRINCIPLES.map((p) => `- ${p}`).join("\n")}

Avoid:
${AVOID.map((a) => `- ${a}`).join("\n")}

Worked examples of the target register:
${examples}`;
}
