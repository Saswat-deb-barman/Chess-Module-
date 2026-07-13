# Chess by Alchemist — Handoff

A chess web app: play Stockfish solo, or play a friend in real time —
both modes get live LLM commentary during the game and a 5-persona
post-game analysis ("the Council") once it ends. Google sign-in is
optional; signed-in players get a persisted game history.

## Play it now

**[chess-module.vercel.app](https://chess-module.vercel.app)**

To play a friend: sign in with Google → **Play a friend** → **Create a
room** → send your friend the page URL with `?room=CODE` appended (shown
on the waiting screen) or just the code itself. They sign in, paste the
code (or open your link, which pre-fills it), and click join.

## Next build: Cycle 2

Scoped in [`docs/CHESS_MVP_PRD_CYCLE_2.md`](docs/CHESS_MVP_PRD_CYCLE_2.md)
(supersedes nothing, extends [`docs/CHESS_MVP_UX_SPEC.md`](docs/CHESS_MVP_UX_SPEC.md)
v0.1). Theme: make the board feel like a real board — fix the drag
offset, add a turn indicator and legal-move dots, a check alert, the
move-list rail toggle, a 60-second disconnect grace (server-authoritative
room state), login-required routing, and council-as-commentator (not
advisor) boxes. Not started yet — a plan is being drafted before any
code changes.

## Current status

| Piece | Status |
|---|---|
| Solo vs. bot | ✅ Done, verified live — one exception: checkmate/stalemate/draw end-of-game *messages* are code-reviewed but have never actually been triggered in a live test (every test game so far ended by resignation or flag-fall) |
| Play a friend (real-time multiplayer) | ✅ Built, verified via simulated identities + local browser tabs — **not yet verified with two real humans on the live site** |
| Live commentary (pings + recap), both modes | ✅ Built, wired, verified live |
| 5-persona Council Report, solo mode | ✅ Built, 3 real bugs found and fixed this session, verified live end-to-end |
| 5-persona Council Report, friend mode | ✅ Built and wired — dedup logic verified against real functions under a simulated race; **not yet verified live with two humans** |
| Deployment (GitHub → Vercel + Render, Neon DB, CORS, Google OAuth) | ✅ Done, verified live |
| Visual design system | 🎨 Direction proposed as a static mockup, **not yet wired into the real app** — see "Design system" below |

**The one open item**: an actual two-human click-through on the deployed
site — sign in as two different Google accounts in two real tabs, play a
full friend game including a capture/check, let it reach checkmate or
resign, and confirm both players' dashboards show the game with the
correct opponent, the Council Report renders for both, and each can ask
their own follow-up question. This needs a real second Google account,
which is why it hasn't been done from an automated browser.

## Design system

The app has never had a real visual identity — solo mode's original
styling was intentionally minimal, and everything since (multiplayer,
the Council) was styled ad hoc, reusing whatever classes already existed.
A proper design system was scoped out in a static mockup before touching
any real component:

**[Artifact: design system + 4 screens](https://claude.ai/code/artifact/5dacba77-9fa9-4df1-93f4-5797ae44f3b1)**
— landing page, sign-in, dashboard + in-game view, and the post-game
Council Report, all in one page (top nav switches between them).

Direction: **"The Adjournment"** — classical tournament chess (a game
paused mid-thought, scoresheets, brass clocks), not a generic cozy-library
look. Graphite ground, a patinated verdigris-green accent, brass reserved
for the Council's voice, muted brick-red for blunders. Three typefaces
doing three distinct jobs: Fraunces (serif, italic for the Council's
"voice"), Public Sans (UI chrome), IBM Plex Mono (anything notational —
clocks, PGN, room codes, defining-move tags) — all three embedded as
real font files (fetched from Google Fonts and inlined as base64 data
URIs, since the Artifact sandbox blocks live font CDN links). Both light
and dark themes are fully built, not just declared — verified in-browser.
The post-game screen's example content is a real, verifiable game (the
Légal Trap) run through the actual `analyzeGame()` classification logic,
not placeholder text.

**Two real bugs were found and fixed while reviewing the mockup itself**,
worth knowing if this pattern comes up again: (1) a character-encoding
issue where em-dashes and accented characters rendered as mojibake
(`Ã¢â‚¬"` style garbage) because the browser guessed the wrong charset —
fixed by converting every non-ASCII character to an HTML entity rather
than trusting encoding negotiation; (2) a blind find-and-replace for
prose apostrophes almost corrupted every CSS/JS string literal in the
file (`'Fraunces Voice'`, `querySelectorAll('.screen')`, etc.) — caught
before publishing by checking the actual character being replaced wasn't
also a code delimiter, not just a prose character.

**Not yet done**: porting this into the real React components
(`Board.jsx`, `MultiplayerBoard.jsx`, `GameHistory.jsx`, `App.css`, the
hand-built board would map to `react-chessboard`'s `customSquareStyles`/
`customPieces` props). Waiting on a decision: wire it in as-is, or
adjust the direction first.

## Architecture

```
src/
  App.jsx                     setup screen -> board -> post-game screen
  App.css                     all styling
  components/
    DifficultySelector.jsx    easy/medium/hard, locked once game starts
    Clock.jsx                 10+0 countdown, one side ticking at a time
    Board.jsx                 react-chessboard + chess.js + bot move loop + resign + Council Report trigger
    MoveHistory.jsx           PGN display + copy button
    CouncilPanel.jsx          renders live council pings + post-game recap
    CouncilReport.jsx         renders the 5-persona report + defining-moves timeline (both modes)
    SignInButton.jsx          Google sign-in, optional — hidden if unconfigured
    GameHistory.jsx           expandable past-games list (GameRow, viewer-color-aware) + per-game GameChat
    FriendLobby.jsx           create/join a friend room; ?room=CODE pre-fills the join form
    MultiplayerBoard.jsx      1v1 board: server-relayed moves, resign, own Engine instance for post-game analysis
  engine/
    stockfishWorker.js        UCI wrapper around Stockfish WASM worker; analyzePosition() for post-game eval
  lib/
    gameLogic.js              chess.js wrapper: moves, game-over detection
    gameAnalysis.js           replays a finished PGN, classifies each move's eval swing, picks defining moves
    council.js                fetch client for the council backend below
    games.js                  fetch client for /games (save, list, patch recap/report, ask); onUnauthorized -> signOut
    auth.jsx                  Google ID-token auth context/provider
    multiplayerSocket.js      shared socket.io-client singleton, sends idToken via handshake.auth
server/                       standalone Node backend, run separately
  index.js                    Express app + Socket.io on the same http server; runs migrate() on boot
  socket.js                   room create/join, authoritative move validation, resign/timeExpired, commentary + Council Report + persistence on game-over
  rooms.js                    in-memory room Map, code generation, disconnect/cleanup bookkeeping, reportRequested dedup flag
  gameEngine.js                server-side port of gameLogic.js + detectMoment (frontend/backend are separate packages, kept in sync manually)
  council.js                  Anthropic API calls + prompt building (getPing, getRecap, getCouncilReport, answerQuestion)
  db.js                       pg pool, migrate()/saveGame()/updateGameRecap()/updateGameCouncilReport()/getGame()/listGames() — ownership-checked against google_sub OR white_google_sub OR black_google_sub
  auth.js                     verifies Google ID tokens; requireAuth (Express) + reused directly in socket.js's io.use
  .env.example                ANTHROPIC_API_KEY, DATABASE_URL, GOOGLE_CLIENT_ID
.env.example                  root/frontend: VITE_GOOGLE_CLIENT_ID, VITE_COUNCIL_URL, VITE_SOCKET_URL (optional, falls back to VITE_COUNCIL_URL)
```

## Running locally

```
cp .env.example .env                      # fill in VITE_GOOGLE_CLIENT_ID
cd server && cp .env.example .env         # fill in ANTHROPIC_API_KEY, DATABASE_URL, GOOGLE_CLIENT_ID
cd ..
npm run dev:all                           # starts both servers, open http://localhost:5173
```

Both the council LLM calls and the Postgres persistence fail soft — if
`ANTHROPIC_API_KEY` or `DATABASE_URL` aren't set, the chess game itself
is completely unaffected, the relevant UI just stays empty. Sign-in is
the same: `AuthProvider` degrades to guest-only automatically when
`VITE_GOOGLE_CLIENT_ID` isn't set.

## Deployment

| Service | What | Notes |
|---|---|---|
| GitHub | [Saswat-deb-barman/Chess-Module-](https://github.com/Saswat-deb-barman/Chess-Module-) | Personal account (not an org — see gotchas below for why that mattered) |
| Vercel | [chess-module.vercel.app](https://chess-module.vercel.app) | Frontend, auto-deploys on push to `main`. Env vars: `VITE_GOOGLE_CLIENT_ID`, `VITE_COUNCIL_URL`, `VITE_SOCKET_URL` |
| Render | `chess-mvp-server.onrender.com` | Backend, root dir `server`, start command `node index.js` (no `npm start` script exists — must be set explicitly), free tier, auto-deploys on push. Env vars: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `GOOGLE_CLIENT_ID` |
| Neon | Postgres | Same DB local dev points at — no dev/prod schema drift |

**CORS**: `server/index.js` reads an `allowedOrigins` allowlist (env var
`CLIENT_ORIGIN`, comma-separated, defaults to
`http://localhost:5173,https://chess-module.vercel.app`), shared between
Express's `cors()` and the Socket.io server's own `cors` option.

**Google OAuth**: the deployed frontend URL is added to the OAuth
Client's Authorized JavaScript origins (Console → Credentials), alongside
localhost. Two setup gotchas that already cost time once — worth knowing
if this needs redoing on a new client:
1. `http://localhost:5173` (and the deployed URL) must be under
   **Authorized JavaScript origins**, not Authorized redirect URIs — this
   app's `<GoogleLogin>` flow never redirects.
2. The OAuth consent screen defaults to **Testing** publishing status,
   which silently blocks *all* sign-ins, including the developer's own
   account, unless that account is added under **Test users**.

**Known risk, accepted, not yet stress-tested**: Render's free tier
idle-sleeps, and Socket.io keep-alive traffic may not reliably reset that
timer — a friend game with two slow-thinking players carries some risk
of a mid-game disconnect. Upgrade to Render's Starter tier (~$7/mo, no
sleep) only if this turns out to be a real problem in practice.

## Implementation notes worth knowing before touching this code

- **UCI eval sign convention**: Stockfish's `score cp` is always from the
  perspective of whoever is *to move* in the position just sent, which
  alternates every ply regardless of who made the move. `gameAnalysis.js`
  flips sign specifically when White was the mover (since the position
  sent next has Black to move, i.e. the raw score is Black's
  perspective). Getting this backwards silently inverts every blunder/
  excellent-move classification without erroring — it's the kind of bug
  that only shows up by checking actual output against a known blunder.
- **React StrictMode + refs that track unmount**: any `useRef` set to
  `true` in an effect's cleanup and read as a guard elsewhere must be
  reset to `false` at the top of the *same* effect, not just declared
  once via `useRef(false)`. StrictMode's dev-mode double-invoke (mount →
  cleanup → mount) otherwise poisons the guard permanently after the
  first cleanup, and the symptom looks exactly like a hung async
  operation — the operation actually completes, but every guard checking
  "am I still mounted" bails out forever. Both `Board.jsx` and
  `MultiplayerBoard.jsx` reset their `unmountedRef` this way now.
- **Claude Sonnet 5 defaults to adaptive thinking when `thinking` is
  omitted** (a behavior change from 4.6). For a fixed, small `max_tokens`
  budget on a complex prompt, this can consume the entire budget on
  thinking before producing any output text at all. `server/council.js`'s
  `getCouncilReport` sets `thinking: { type: "disabled" }` explicitly —
  it's pure narration over data the engine already computed, no reasoning
  needed.
- **Server-side Stockfish in Node doesn't work** (at least not with the
  `stockfish` npm package's WASM build, on the Node version this was
  tested against) — it reliably stalls after the engine's first output
  line, both `require()`'d in-process and spawned as a child process.
  Not investigated further since a simpler design existed: the defining-
  move analysis for friend-mode games runs client-side in
  `MultiplayerBoard.jsx` (mirroring solo mode), and only the LLM call +
  persistence — the actually costly, actually duplicable part — is
  guarded server-side against both players' clients submitting (see
  `rooms.js`'s `reportRequested` flag).
- **Frontend and backend are separate npm packages** (`gameLogic.js` /
  `gameEngine.js`, `stockfishWorker.js`'s browser Worker vs. nothing on
  the server) — some logic is deliberately duplicated across the
  boundary. Keep both in sync if either changes.
- **No reconnect/rejoin-by-token mechanism** for friend mode — a page
  refresh mid-game currently forfeits your seat. Deliberately deferred,
  not an oversight; revisit only if that turns out to be a frequent real
  complaint.

## Verification approach for anything behind Google sign-in

Automated test browsers have no signed-in identity, and the auth gate
correctly blocks guest sockets from creating/joining friend rooms. The
approach used throughout this project: exercise the same underlying
functions `socket.js`/`index.js` call (`createRoom`, `saveGame`,
`getPing`, `getRecap`, `getCouncilReport`, `updateGameCouncilReport`,
etc.) directly with simulated identities — including, for the friend-mode
Council Report dedup guard, replicating the exact handler logic under a
real `Promise.all` race to prove only one LLM call fires. This is as
rigorous as a live two-browser test for everything except the actual
Google OAuth handshake itself, which was separately proven (rejects
missing/garbage tokens) once. Test rows get cleaned up from the real
Neon DB afterward.

## Anthropic API usage in this project

- Live pings: `claude-haiku-4-5-20251001`, short/cheap, fired on
  checkmate/check/capture only (checked in that priority order so a
  mating move doesn't also fire a generic "check" reaction).
- One-line recap: `claude-sonnet-5`, once per finished game.
- 5-persona Council Report: `claude-sonnet-5`, once per finished game,
  single call (not 5 separate persona calls) with a strict-JSON response
  contract, `thinking` disabled (see gotcha above).
- All three fail soft to `null`/empty — an LLM outage never blocks or
  breaks gameplay.
