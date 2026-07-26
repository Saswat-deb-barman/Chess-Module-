// Curated chess facts/history for the dashboard's "Learn about chess"
// zone — same convention as src/lib/loginReplays.js: a flat array
// written by me, no backend/LLM cost, works instantly regardless of
// auth or game history.
export const CHESS_FACTS = [
  {
    title: "The queen used to be weak",
    body: "For centuries the queen could only move one square diagonally — barely more powerful than a king. Her modern, sweeping movement wasn't standardized until the late 1400s in Spain, a change so dramatic the new game was nicknamed \"Queen's Chess.\"",
  },
  {
    title: "Castling took 300 years to settle",
    body: "The king-and-rook move we now call castling existed in rough forms as early as the 1300s, but different regions played it differently for centuries. The two-squares-and-swap version used worldwide today wasn't fully standardized until the 1600s.",
  },
  {
    title: "There are more possible games than atoms in the universe",
    body: "The Shannon number — a famous lower-bound estimate of possible chess games — is about 10^120. There are roughly 10^80 atoms in the observable universe. Chess isn't just complicated; it's combinatorially inexhaustible.",
  },
  {
    title: "The Sicilian Defense is the most popular reply to 1.e4",
    body: "At every level from club play to world championships, 1.e4 c5 (the Sicilian) is statistically Black's most common answer to White's most common opening move — prized for the unbalanced, fighting positions it creates.",
  },
  {
    title: "Fool's Mate is the fastest possible checkmate",
    body: "Two moves each: 1.f3 e5 2.g4 Qh4#. It requires White to weaken the king's diagonal so badly, so fast, that it's almost never seen outside of total beginners playing each other — but it's a genuine legal game.",
  },
  {
    title: "Bobby Fischer once demanded a rule change mid-career",
    body: "Frustrated by opponents pre-preparing deep opening lines with computers, Fischer proposed \"Fischer Random\" (Chess960) — a variant that randomizes the back-rank starting position, forcing real over-the-board thinking from move one.",
  },
  {
    title: "\"Checkmate\" comes from Persian, not English",
    body: "The word traces back through Arabic to the Persian phrase \"shah mat,\" roughly \"the king is helpless\" or \"the king is left.\" Chess itself likely originated in India (as chaturanga) before spreading through Persia to the rest of the world.",
  },
  {
    title: "En passant exists because of a rule change 500 years ago",
    body: "When pawns gained the option to move two squares on their first move (another 1400s change), it created a loophole letting a pawn slip past an enemy pawn untouched. En passant was invented specifically to close that gap.",
  },
  {
    title: "A stalemate is a draw — even if you're about to lose everything",
    body: "If the player to move has no legal move and isn't in check, the game is an immediate draw, no matter how lopsided the material is. Being up a queen and three rooks doesn't matter if you accidentally stalemate a lone king.",
  },
  {
    title: "The longest official chess game lasted over 20 hours",
    body: "A 1989 game between Ivan Nikolić and Goran Arsović ran 269 moves before ending in a draw — long enough that it helped convince FIDE to eventually tighten the 50-move (no-progress) draw rule's practical enforcement.",
  },
];

export function pickChessFact(excludeIndex = -1) {
  if (CHESS_FACTS.length <= 1) return { index: 0, fact: CHESS_FACTS[0] };
  let index = Math.floor(Math.random() * CHESS_FACTS.length);
  if (index === excludeIndex) index = (index + 1) % CHESS_FACTS.length;
  return { index, fact: CHESS_FACTS[index] };
}
