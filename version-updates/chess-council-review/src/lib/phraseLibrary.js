/**
 * The Council's voice library — a growing, curated bank of phrasing the
 * LLM prompts draw from as style anchors, rather than a one-line "sound
 * like X" instruction. The target register comes from Jessi Shakarian's
 * "Chess & Information Architecture" (uxdesign.cc/chess-information-
 * architecture-an-introduction-5f9476a4d6e2): measured, reflective,
 * explanatory prose that connects cause to effect in plain declarative
 * sentences — not hype, not mock-excitement, not a play-by-play.
 *
 * This file is meant to be edited and grown over time, the same way
 * Saswat's own game-tracking vocabulary grows — add a worked example
 * whenever a report turns out especially well, prune a pattern that
 * keeps producing stiff output.
 *
 * Organized around the DIKW ladder the article actually argues for:
 *   Data       -> already objective numbers (gameAnalysis.js) — no voice needed here
 *   Information -> naming what happened, precisely (square, piece, phase)
 *   Knowledge   -> explaining the mechanism ("why that square is dangerous")
 *   Insight     -> the immediate consequence ("why THIS moment mattered")
 *   Wisdom      -> the cross-game, practical takeaway
 * See server/council.js's getCouncilReport for how these get assembled
 * into the actual prompt.
 */

// Non-negotiables — every generated line should be checkable against
// this list. If a draft trips one of these, the instinct is to cut the
// line rather than soften it.
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

// Knowledge-layer patterns: naming the mechanism. These explain WHY a
// square, structure, or moment is meaningful in general chess terms,
// before Insight explains why it mattered in this specific game.
export const KNOWLEDGE_PATTERNS = [
  "{square} was undefended after {priorMove}, which is what made {move} possible.",
  "Castling on move {n} is close to on-time — the king was out of the center before the middlegame opened up.",
  "Never castling means the king carries every future opening of the position as risk, not just the moment it happens.",
  "{piece} moving to {square} gives up the square it was covering, which matters because {consequence}.",
  "The position had simplified enough by move {n} that this becomes an endgame question, not a middlegame one.",
];

// Insight-layer patterns: the immediate "why did this move matter right
// now" — this is what replaces the bare classification badges.
export const INSIGHT_PATTERNS = [
  "This is the moment the game actually turned — not because of the material, but because {mechanism}.",
  "The swing here (~{cp}cp) is a real number, but the more useful fact is {reason}.",
  "This move looks routine and isn't: it {consequence}.",
  "The engine flags this as {classification}, and the reason is simple once you see it — {mechanism}.",
  "This is the point where the earlier decision on move {earlierMove} stopped being theoretical and started costing material.",
];

// Wisdom-layer patterns: the cross-game, practical takeaway. This is
// Coach Priya's territory specifically — one clear thing to carry
// forward, tied to a named pattern where possible.
export const WISDOM_PATTERNS = [
  "The recurring thread across this game is {pattern} — worth watching for specifically in the next one, not chess in general.",
  "This isn't a one-off: {pattern} shows up whenever {condition}, which makes it a habit to build, not a single fix.",
  "The encouraging part is {positivePattern} — that's a skill, not luck, and it held up under real pressure here.",
  "One concrete thing to carry into the next game: {actionable}.",
];

// Full worked examples, written against real moves from Saswat's own
// example game (1.e4 c5 2.Bc4 b5 3.Bxb5 ... 58.Nxb4 1-0) — kept as
// anchors because a generic template sample doesn't teach the model the
// actual register the way a real, complete sentence does.
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
 * Formats the library into a single prompt-injectable block. Kept
 * intentionally short (principles + avoid-list + a couple of worked
 * examples, not the whole library) — a wall of examples tends to make
 * the model copy phrasing verbatim rather than internalize the register.
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
