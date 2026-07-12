# Chess Council — Game Review (standalone)

Paste any finished game's PGN and get back, in this order:

1. **Council Score** — five deterministic, engine-derived numbers rating
   one player's performance in the game (Calculation, King Safety,
   Material Control, Endgame Technique, Resilience), rendered as a radar
   chart + stat pills. No LLM involved — same number every time you run
   the same game, which is the point: it's the trustworthy anchor the
   prose sections sit underneath.
2. **Defining moves** — the engine's objectively-flagged blunders,
   mistakes, inaccuracies, and excellent moves (centipawn-swing
   classification), each with an Insight-layer caption explaining *why*
   it mattered — not just that it happened — and tagged to a named
   pattern (hanging piece, recapture safety, castling timing, mating
   technique, opening theory) where one applies.
3. **The Council's report** — Knowledge-layer paragraphs from The
   Historian, Strategist Sam, and Endgame Ed, plus Coach Priya's
   Wisdom-layer, cross-game takeaway.

Fully standalone — doesn't read from or write to chess-mvp's core app,
database, or auth. Not tied to chess-mvp games specifically; works on any
PGN, including games tracked outside this app.

## Voice

The target register comes from [Jessi Shakarian's "Chess & Information
Architecture"](https://uxdesign.cc/chess-information-architecture-an-introduction-5f9476a4d6e2)
— specifically its Data → Information → Knowledge → Insight → Wisdom
ladder, and its measured, explanatory prose (not hype, not mock
excitement, not a play-by-play). `src/lib/phraseLibrary.js` (and its
server-side duplicate, `server/phraseLibrary.js` — see Architecture notes
for why they're separate files) is the actual voice asset: a growing bank
of principles, an explicit avoid-list, and worked examples, injected into
the LLM prompt as a style anchor rather than a one-line instruction. Add
a worked example whenever a report turns out especially well; prune a
pattern that keeps producing stiff output. This is meant to keep growing
over time, the same way Saswat's own game-tracking vocabulary does.

**Not built here, flagged for later promotion**: chess-mvp core's live
"council pings" (`server/council.js`'s `MOMENT_PROMPTS`, rendered by
`CouncilPanel.jsx`) have the exact problem this redesign was meant to
fix — "Oh snap, your king's in trouble!" is Data restated with a costume
on, no Information/Knowledge/Insight added. Fixing that means editing
core files, which is explicitly out of scope for this module. The voice
library above is written to be reusable there once that promotion
happens — it isn't specific to the post-game report shape.

## Example report

`examples/` is the approved reference for this structure — Saswat signed
off on this exact shape and voice against a real game (a wild 58-move
Sicilian sideline, White winning after both sides traded several full
blunders). Treat it as the bar future output should match, not a stale
sample:

- `examples/sample-game.pgn` — the input.
- `examples/generate-sample.mjs` — regenerates the deterministic half
  (`definingMoves`, `scoreWhite`, `scoreBlack`) from the PGN using the
  real, shipped `src/lib/councilScore.js` — run it with `node
  examples/generate-sample.mjs` (needs `chess.js` resolvable, i.e. run
  after `npm install` in this folder). The hand-assigned eval swings it
  uses (in lieu of a live engine run) are documented inline and were
  checked against a manual material count of the actual game.
- `examples/sample-report.json` — the full fixture, including the
  Knowledge/Insight/Wisdom prose. That prose was hand-written to the
  exact target schema and voice as a worked example — it's what a live
  `getCouncilReport` call is expected to produce, not something the
  generator script can reproduce on its own (that needs a real
  `ANTHROPIC_API_KEY` and a live call). Don't overwrite it by re-running
  the generator; diff new real output against it instead.

## Run locally

Two pieces, same split as chess-mvp core (a browser can't hold an
Anthropic API key):

```
cd version-updates/chess-council-review
npm install
cp .env.example .env              # VITE_REVIEW_API_URL — default is fine locally

cd server
npm install
cp .env.example .env              # fill in ANTHROPIC_API_KEY=

cd ..
npm run dev:all                   # frontend :5174, review server :8788
```

Open http://localhost:5174, paste a PGN, click "Review game."

If the backend isn't running or has no API key, the council persona
report comes back empty but the engine-flagged defining moves still
show — same fail-soft contract chess-mvp core's council already uses.

## Deploy (independent from chess-mvp's own deploy)

- **Frontend**: any static host (Vercel, Netlify) — `npm run build`,
  deploy `dist/`. Set `VITE_REVIEW_API_URL` to wherever the server below
  ends up.
- **Server**: any Node host (Render, Railway, Fly) — needs
  `ANTHROPIC_API_KEY` set. CORS is wide open by default (`cors()` with no
  options) — lock this down to the deployed frontend's real origin before
  going live, same reminder chess-mvp core's own HANDOFF.md carries.

Both pieces are independent projects on whatever host you pick — nothing
here depends on chess-mvp core's Vercel/Render/Neon setup, and deploying
this doesn't touch or redeploy the live game.

## Architecture notes

- `src/engine/stockfishEngine.js` — a standalone Stockfish WASM wrapper,
  analysis-only (no play/difficulty logic, unlike chess-mvp core's
  `stockfishWorker.js`, since this tool never plays a game, only reviews
  a finished one).
- `src/lib/gameAnalysis.js` — the move-classification logic. Careful
  about UCI's `score cp`/`score mate` always being from the perspective
  of whoever is to move in the position just sent — that alternates every
  ply regardless of who made the move, so it's normalized to a single
  consistent (White's) frame before deriving each move's swing from the
  mover's own perspective.
- `src/lib/councilScore.js` — the five-parameter deterministic scoring
  model. Pure arithmetic over `plies`, no LLM. Deliberately mirrors the
  pattern categories Saswat already tracks by hand (Calculation ≈ hanging
  pieces, King Safety ≈ castling timing, Material Control ≈ recapture
  safety specifically, Endgame Technique ≈ mating technique/stalemate
  traps, Resilience ≈ recovering from a material deficit). Time
  management is deliberately absent as a 6th axis — a PGN carries no
  clock data, so nothing computed from `plies` alone could honestly claim
  it; that needs its own instrumentation (per-move clock times flowing
  from Board.jsx's Clock component into the analysis pipeline) before it
  can be added.
- `src/components/CouncilScore.jsx` — hand-rolled SVG radar chart, no
  charting library dependency (keeps this module's dependency list
  short). Fixed 5-axis order matching `councilScore.js` exactly.
- `src/lib/phraseLibrary.js` / `server/phraseLibrary.js` — the voice
  asset described above. Two copies, not one shared file, same reasoning
  as `gameAnalysis.js`/`council.js` already being duplicated between core
  and this module and between this module's own frontend/server: they're
  independent deploy targets, so nothing on one side reaches into the
  other's folder at runtime. Keep both in sync by hand when the voice
  changes.
- `server/council.js` — the Knowledge/Insight/Wisdom prompt + strict-JSON
  response contract (see Voice above for the restructuring away from five
  parallel personas). Self-contained copy, not shared code with
  chess-mvp core's `server/council.js`, by design — this module has to be
  deployable on its own.
- Ports are deliberately different from chess-mvp core's (`5174`/`8788`
  vs. core's `5173`/`8787`) so both can run side by side locally.
