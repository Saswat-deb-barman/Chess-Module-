// Curated, static PGN pack for the login screen's decorative board
// (LOGIN_SPEC_V1 §3.2) — a small bundled set of finished games, not
// fetched from a backend. The front door must never need data that
// lives behind auth, and a public sign-in screen showing someone's real
// in-progress game is a privacy question this sidesteps entirely.
// Generic/instructive games with no player names attached (a deliberate
// choice made with the project owner — no real friend-group data here).
export const LOGIN_REPLAYS = [
  // Légal's Mate — a classic 18th-century trap, sharp and short.
  "1. e4 e5 2. Bc4 d6 3. Nf3 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#",
  // Scholar's Mate — the fastest common beginner trap.
  "1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#",
  // Fool's Mate — the shortest possible checkmate in the game.
  "1. f3 e5 2. g4 Qh4#",
  // Ruy Lopez, Closed — quiet, classical opening theory; the "clean
  // positional game" alongside the sharper traps above.
  "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7",
];

export function pickLoginReplay() {
  return LOGIN_REPLAYS[Math.floor(Math.random() * LOGIN_REPLAYS.length)];
}
