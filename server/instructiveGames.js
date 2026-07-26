// Curated fallback library for "Talk to the Council" — used whenever a
// user has no games of their own yet (or as extra context alongside
// them). Same spirit as src/lib/loginReplays.js (generic, no real
// friend-group data) but each entry carries a `concept` label so the
// council's answer has something concrete to teach from even on a
// user's very first visit.
export const INSTRUCTIVE_GAMES = [
  {
    pgn: "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#",
    concept: "Scholar's Mate — why an undeveloped, unguarded f7/f2 is the classic beginner weakness",
  },
  {
    pgn: "1. e4 e5 2. Bc4 d6 3. Nf3 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#",
    concept: "Légal's Mate — why material isn't everything when the king is exposed",
  },
  {
    pgn: "1. f3 e5 2. g4 Qh4#",
    concept: "Fool's Mate — the fastest possible checkmate, and why weakening squares near your own king early is dangerous",
  },
  {
    pgn: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7",
    concept: "Ruy Lopez, Closed — quiet, classical development and why fighting for the center early pays off later",
  },
];
