# Chess MVP — Phase 1 Handoff

## Immediate resume point — Milestone 8 (deployment) DONE and verified live
GitHub, Vercel, Render, Neon, and Google OAuth are all wired together and
confirmed working end to end:
- **GitHub**: pushed to a **personal** account repo,
  [Saswat-deb-barman/Chess-Module-](https://github.com/Saswat-deb-barman/Chess-Module-)
  (not the `saswat-alchemist` org — that org rejected PATs with a clean
  403; personal account was the deliberate fix, see below for the
  troubleshooting trail if this resurfaces on a future project).
- **Frontend (Vercel)**: live at
  [chess-module.vercel.app](https://chess-module.vercel.app), project
  under the `saswatalchemist` Vercel account, auto-deploys on push to
  `main`. Env vars set: `VITE_GOOGLE_CLIENT_ID`, `VITE_COUNCIL_URL`,
  `VITE_SOCKET_URL` (the latter two both point at the Render backend
  below).
- **Backend (Render)**: live at
  `https://chess-mvp-server.onrender.com`, root directory `server`,
  start command `node index.js` (no `npm start` script exists — must be
  set explicitly), free tier. Env vars set: `ANTHROPIC_API_KEY`,
  `DATABASE_URL`, `GOOGLE_CLIENT_ID`. Auto-deploys on push to `main`.
- **CORS**: `server/index.js` now reads an `allowedOrigins` allowlist
  (env var `CLIENT_ORIGIN`, comma-separated, defaults to
  `http://localhost:5173,https://chess-module.vercel.app`) instead of
  the old wide-open `origin: "*"` on both Express's `cors()` and the
  Socket.io server — verified live with a `curl -X OPTIONS` origin
  check against the deployed backend.
- **Google OAuth**: `https://chess-module.vercel.app` added to
  Authorized JavaScript origins in Google Cloud Console (by the project
  owner — this is account-settings access I don't have). Confirmed
  working with an actual live sign-in on the deployed site, no more
  `origin_mismatch`.

**What's left**: the two-human click-through (sign in as two different
Google accounts in two real tabs, play a full friend game including a
capture/check, reach checkmate/resign, confirm both dashboards show the
right opponent) still hasn't been done — see "Immediate next step"
further down. Render's free-tier idle-sleep risk for mid-game friend
disconnects (noted under "Deployment" below) also hasn't been stress
-tested in practice yet, just decided to accept for now.

**Housekeeping note**: there's a "Chess Council module" (5-persona
post-game report, see section below) committed locally
(`f725a23`) but not yet pushed to GitHub/Render — check with whoever's
working on it before pushing, since it hasn't been verified in this
session.

**GitHub org 403 troubleshooting trail (for reference, already resolved)**:
first tried pushing to `saswat-alchemist/Chess-module` on GitHub, which
turned out to be an **organization**, not a personal account — got a
clean `403 Permission to saswat-alchemist/Chess-module.git denied to
saswat-alchemist` even with a correctly-scoped classic PAT, the
signature of an org that restricts personal-access-token access (needs
either SSO authorization on the token or an org owner to allow PATs
under Organization Settings → Third-party Access). Fixed by moving to a
personal account instead. Two PATs were pasted directly into chat during
this troubleshooting and are dead — one was revoked proactively, the
other should be checked/revoked at
[github.com/settings/tokens](https://github.com/settings/tokens) if that
hasn't happened yet, same reasoning as always: anything pasted in a chat
transcript should be treated as burned regardless of whether it still
technically works. A later push also briefly authenticated as the wrong
GitHub account (`saswat-alchemist` instead of `saswat-deb-barman`)
because the browser was still logged into the org account when the PAT
was generated — fixed by generating the PAT while logged into the
correct personal account.

## Chess Council module — 5-persona post-game analysis (new, solo-vs-bot only)
**Verified working end-to-end as of this session** — three real bugs were
found and fixed during verification (all confirmed live, not just by
reading code):
1. **Eval sign was inverted** ([src/lib/gameAnalysis.js](src/lib/gameAnalysis.js)) —
   UCI's `score cp` is from the perspective of whoever is *to move* in the
   position just sent, which alternates every ply. The code took it as-is
   and labeled it "White's perspective" without ever flipping sign. Proved
   with a real game: a deliberate knight sac (an actual blunder) computed a
   *positive* swing and got classified "normal" instead of a large negative
   swing crossing into "blunder." Fixed by flipping sign whenever White was
   the mover (since the position sent is then Black-to-move, so the raw
   score is Black's perspective).
2. **Council Report hung forever in local dev** ([src/components/Board.jsx](src/components/Board.jsx)) —
   `unmountedRef` gets set `true` by React 18 StrictMode's dev-mode
   double-invoke of the engine-setup effect's cleanup, and was never reset
   back to `false` on the following real mount. Confirmed by instrumenting
   the actual Worker: the analysis silently completed correctly in the
   background, but `runCouncilAnalysis`'s `if (unmountedRef.current) return`
   guards swallowed the result before `/council/report` ever fired, and the
   loading state never cleared. Since this project's own dev instructions
   use `npm run dev` (StrictMode on), this made the feature look permanently
   broken in exactly the environment used to test it. Fixed by resetting
   `unmountedRef.current = false` at the top of the mount effect.
3. **`getCouncilReport` always returned null** ([server/council.js](server/council.js)) —
   Claude Sonnet 5 defaults to adaptive thinking when the `thinking` param
   is omitted (a Sonnet-5-specific behavior change from 4.6), and for this
   multi-persona JSON prompt it spent the *entire* `max_tokens: 1200`
   budget thinking before producing any output text
   (`stop_reason: "max_tokens"`, empty content). `getPing`/`getRecap`
   happen to survive this because their simpler prompts don't trigger much
   adaptive thinking. Fixed by setting `thinking: { type: "disabled" }` —
   this is pure narration over data the engine already computed, no
   reasoning needed.

Built on top of the existing lightweight "council" (live pings + one-line
recap, both still unchanged) to add the deeper post-game breakdown Saswat
already does by hand outside this app: five named coaching personas (The
Historian, Tactics Tara, Strategist Sam, Endgame Ed, Coach Priya — same
framing as his external game analysis, kept identical on purpose) plus an
engine-flagged list of the game's "defining moves." Renders as a new
**Council Report** panel under the existing council ping panel once a
game ends, and persists to game history the same way recap already does.

**Architecture, hybrid by design**: the engine does the objective
detection, the LLM does the narration — never the other way around.
1. `src/engine/stockfishWorker.js` — `Engine.analyzePosition(fen, {depth})`
   is new, separate from `getBestMove`. Returns `{evalCp, mate, bestMove}`
   by parsing `info ... score cp/mate` lines. Deliberately doesn't touch
   Skill Level — that setting only weakens which move the engine *chooses*
   during play, not how accurately it *scores* a position, so the same
   engine instance that just played the game is reused for its own
   analysis afterward at a fixed depth (12), no second engine needed.
2. `src/lib/gameAnalysis.js` — `analyzeGame(pgn, engine)` replays the
   finished PGN ply-by-ply, evals each resulting position, and computes
   each move's centipawn swing from the *mover's own* perspective
   (isolating "did this move make their own position worse than it
   already was" from "the opponent had already blundered earlier").
   Classifies blunder/mistake/inaccuracy/excellent/normal by threshold,
   always includes the checkmating move + final move + first blunder
   regardless of magnitude, then fills remaining slots (capped at 6) by
   largest swing. This is the piece HANDOFF previously flagged as
   deliberately deferred ("needs stockfishWorker.js to parse live info
   lines, not just bestmove") — now built.
3. `server/council.js` — `getCouncilReport({pgn, result, definingMoves})`
   is a single Sonnet call (not 5 separate persona calls, for cost/latency)
   with a strict-JSON response contract: one paragraph per persona plus a
   `definingMoveNotes[]` array giving each flagged move a one-sentence
   caption in whichever persona's voice fits. Same fail-soft-to-null
   contract as `getPing`/`getRecap` — a parse failure or missing key
   never blocks the post-game screen.
4. New endpoint `POST /council/report`, unauthenticated like the other
   council routes. `PATCH /games/:id` now branches on whether the body
   has `recap` or `councilReport` so patching one never blanks the other.
5. `games.council_report` — new `jsonb` column (`alter table ... add
   column if not exists`, same zero-migration-framework pattern as
   `recap`). Stores `{definingMoves, report}` as one object; `report` can
   be `null` if the LLM call failed but `definingMoves` still came from
   the engine, so the move timeline still shows up even without persona
   prose in that case.
6. `src/components/CouncilReport.jsx` — new component, rendered in both
   `Board.jsx` (live, right after `endGame`) and `GameHistory.jsx`'s
   `GameRow` (from the persisted column). Classification badges are
   color-coded (blunder=red through excellent=green) in `App.css`.

**Now wired up for friend mode too** — originally deferred (see git
history if curious why), then built once solo mode's version had been
verified. `server/socket.js` has no chess engine of its own — a real
attempt to run Stockfish's WASM build directly in Node (both
`require()`'d in-process and spawned as a child process) reliably stalled
after the engine's first identification line, on this Node version; not
worth fighting further given a simpler option existed. So the analysis
still runs client-side in `MultiplayerBoard.jsx` (now has its own `Engine`
instance, mirroring `Board.jsx`'s StrictMode-safe pattern), and **both**
players' clients compute `definingMoves` independently on game-over and
call `socket.emit("submitDefiningMoves", ...)`. The insight that unblocked
this: the actual risk was never the local engine analysis running twice
(free, client-side, no external cost) — it was a duplicate **LLM call +
persistence**, the same class of problem Milestone 6 solved for the
recap. So `server/socket.js`'s new `"submitDefiningMoves"` handler guards
only that part with a `room.reportRequested` flag — first submission
wins and calls `getCouncilReport` + persists; the server then broadcasts
`"councilReport"` to **both** clients regardless of which one it accepted,
so the "losing" submitter's UI still gets the canonical result instead of
hanging. Verified by replicating the exact handler logic against the real
`getCouncilReport`/`updateGameCouncilReport` functions under a real
`Promise.all` race (simulating both clients submitting simultaneously) —
confirmed exactly one LLM call fires and the row persists correctly; test
row cleaned up from Neon afterward. Not yet verified via an actual live
two-human friend game (still blocked on the same auth-gating limitation
noted in Milestones 4-6 — no way to get a real signed-in second identity
into an automated test browser).

## Multiplayer build summary (Milestones 1–7, complete)
All external services are wired up and confirmed working: Anthropic
(council commentary), Google OAuth, and Neon Postgres. All credentials
are already in `server/.env` and root `.env`. **To resume local dev**:
`npm run dev:all` from the project root starts both servers, then open
http://localhost:5173.

**Real-time 1v1 "Play a friend" is built** (Socket.io), in seven
verified milestones — each one tested before the next was built on it
(deployment is the 8th and final milestone, in progress — see above):

1. **Bare transport** — `server/index.js` now runs `http.createServer(app)`
   with a Socket.io server attached, not a plain `app.listen()`.
2. **Room-scoped relay** — `server/rooms.js` (room-code generation,
   collision-checked, no ambiguous characters; a `Map` of in-memory
   rooms; a cleanup sweep for abandoned ones) and `server/socket.js`
   (`createRoom`/`joinRoom`, first/second socket → white/black). New
   `src/components/FriendLobby.jsx` (create/join UI, `?room=CODE` link
   auto-joins) and `src/components/MultiplayerBoard.jsx`.
3. **Server becomes authoritative** — new `server/gameEngine.js` ports
   the pure logic from `src/lib/gameLogic.js` + `Board.jsx`'s
   `detectMoment` server-side (frontend and backend are separate npm
   packages, so this is a deliberate duplication, not a bug — keep both
   in sync if either changes). The server now re-validates every move's
   turn/legality before broadcasting, and owns game-over detection
   (checkmate/draw/resign/`timeExpired`).
4. **Auth gating** — `io.use` middleware reuses the existing
   `verifyGoogleToken` (already built for the REST `requireAuth`
   middleware) to require sign-in before creating/joining a friend room.
   Solo-vs-bot stays guest-friendly, untouched.
5. **Persistence** — `games` table gained `white_google_sub`,
   `white_google_email`, `black_google_sub`, `black_google_email`, `mode`
   columns (additive, same `alter table ... add column if not exists`
   pattern as `recap`). **Found and fixed a real bug here**: `getGame`
   and `updateGameRecap` only checked `google_sub` for ownership, which
   would have 404'd one of the two friend-mode players out of their own
   game's analysis — both now check `google_sub OR white_google_sub OR
   black_google_sub`, matching `listGames`. The server saves the
   finished game directly (same process, no HTTP round-trip) the instant
   it detects game-over.
6. **Commentary** — server calls the existing `getPing`/`getRecap` (from
   `server/council.js`, already framework-agnostic) directly from the
   move/game-over handlers, never client-triggered for friend mode —
   this is what guarantees exactly one ping per move and one recap per
   game instead of both players' clients firing duplicates. **Also found
   and fixed**: `answerQuestion`'s prompt hardcoded *"the player who was
   White"* — true by construction in solo mode (human is always White)
   but wrong for a Black player in a friend game. Now takes an
   `askingColor` param, derived server-side by comparing the requester's
   sub against the row's `white_google_sub`/`black_google_sub`.
7. **Frontend polish** — `MultiplayerBoard.jsx` got a resign button
   (emits `resign`, server is authoritative for the actual result, same
   as everywhere else) and now reuses `CouncilPanel.jsx` for commentary.
   `GameHistory.jsx`'s `GameRow` had a real bug fixed here too: it showed
   `vs {game.black}` unconditionally, which only happened to be correct
   because the viewer was always White in solo mode — now derives the
   opponent from whichever seat *isn't* the signed-in viewer's sub, and
   shows a bot/friend mode badge.

**Verification approach worth knowing if you pick this up**: Milestones
1–3 were tested with two real browser tabs. Milestones 4–6 could not be
tested via live browser tabs, since Milestone 4's auth gate correctly
blocks the automated test browser's guest (never-signed-in) tabs from
creating/joining rooms — instead, the exact same functions `socket.js`
calls (`createRoom`, `saveGame`, `getPing`, `getRecap`, `answerQuestion`,
etc.) were exercised directly with simulated identities, including a
full Fool's Mate game saved to the real Neon DB, retrieved by both
simulated players, recap attached and visible to both, then cleaned up.
This is as rigorous as milestone 1-3's live-browser tests, just via
direct function calls instead of a live OAuth-gated socket — the auth
gate itself was separately proven (rejects missing/garbage tokens) in
Milestone 4.

**Two Google Cloud Console gotchas already fixed, in case they resurface
on a new client**: (1) `http://localhost:5173` must be under **Authorized
JavaScript origins** specifically, not Authorized redirect URIs — this
app's auth flow (`<GoogleLogin>` from `@react-oauth/google`) never
redirects, so the redirect-URI field can stay empty; (2) the OAuth
consent screen defaults to **Testing** publishing status, which silently
blocks *all* sign-ins — including the developer's own account — unless
that account is explicitly added under **Test users**. Both are done for
this project (`rickbarman97@gmail.com` is a test user).

**Deliberately deferred, not silently — a real scope decision**: no
reconnect/rejoin-by-token mechanism. A page refresh mid-friend-game
currently forfeits your seat, same posture as the reference demo this
was built from. Revisit only if that turns out to be a frequent real
complaint, not preemptively.

**Immediate next step (still open — deployment is done, this isn't)**:
an actual two-human click-through, now on the **deployed** site
(chess-module.vercel.app) rather than local — sign in as two different
Google accounts in two real browser tabs, play a full friend game
including a capture/check (for a live council ping), let it reach
checkmate or resign, and confirm both players' dashboards show the game
with the correct opponent and can each ask their own follow-up question.
Now that the Council Report is wired into friend mode too, this test
should also confirm the 5-persona breakdown actually renders for both
players once the game ends (not just the lightweight recap). This needs
a real second Google account, which is why it hasn't been done yet
(automated test browsers have no signed-in identity to use).

## What this is
A bot-only, single-player chess app. No accounts, no database, no
multiplayer, no piece theming yet. The goal is one clean loop: pick a
difficulty, play a 10-minute rapid game against Stockfish, see the result
and PGN. This validates the core stack before Phase 2+ adds accounts,
persistence, real-time multiplayer, LLM commentary, and custom pieces.

## Status of this scaffold
Phase 1 has been installed, run, and click-tested in a real browser —
not just a static skeleton anymore. `react-chessboard` v4.7.3's installed
types were confirmed to match `Board.jsx`'s prop usage exactly
(`onPieceDrop(source, target, piece) => boolean`,
`boardOrientation: "white"|"black"`). Verified live: drag-and-drop moves,
illegal-move snapback, bot reply loop (human move → Stockfish reply →
board/PGN update), flag-fall ending with the correct winner, and "New
game" resetting the clock/board/PGN cleanly across remounts. Checkmate/
stalemate/draw message *logic* was code-reviewed but not exercised move-
by-move live (would take a long scripted sequence to force).

Already verified by actually running `npm install` against this
package.json (106 packages, clean install, no peer-dep errors):
- Confirmed the real Stockfish file names are
  `stockfish-nnue-16-single.js` / `.wasm` — there's no generic
  `stockfish.js` in the package, which is what the first draft of
  `vite.config.js` and `stockfishWorker.js` had assumed. Both files are
  already corrected to the real path.
- Deliberately used the "-single" (single-threaded) build over the
  faster multi-threaded NNUE build, to avoid needing
  `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` response
  headers on whatever host we deploy to (multi-threaded needs
  SharedArrayBuffer, which requires those headers). Single-threaded is
  slightly slower but works with zero server config — matches the
  "light, not clunky" goal. Revisit only if bot response time (~1-2s
  target) isn't met in practice.

## About the previously-uploaded zip (`Chess_com-main.zip`)
This is a small Socket.io + Express + EJS 2-player chess demo (chess.js
for logic, Unicode glyphs for pieces, one global game/players object for
the whole server). **It is not the base for Phase 1** — no bot, no clock,
no difficulty, and it can only run one game at a time process-wide, not
per-room. It's earmarked as a reference for **Phase 3** (play-a-friend via
room code), specifically the socket event pattern for assigning
white/black/spectator roles and broadcasting `move`/`boardState` events —
that part is reusable. Everything else in Phase 1 was built fresh in
React/Vite instead, since later phases (piece skins, commentary UI) need
component-level control the EJS/vanilla-JS setup doesn't give us.

## File map
```
src/
  App.jsx                     setup screen -> board -> post-game screen
  App.css                     all styling, intentionally minimal
  components/
    DifficultySelector.jsx    easy/medium/hard, locked once game starts
    Clock.jsx                 10+0 countdown, one side ticking at a time
    Board.jsx                 react-chessboard + chess.js + bot move loop + resign
    MoveHistory.jsx           PGN display + copy button
    CouncilPanel.jsx          renders live council pings + post-game recap
    SignInButton.jsx          Google sign-in, optional — hidden if unconfigured
    GameHistory.jsx           expandable past-games list (GameRow, viewer-color-aware) + per-game GameChat, always mounted
    FriendLobby.jsx           create/join a friend room; ?room=CODE auto-joins
    MultiplayerBoard.jsx      1v1 board: server-relayed moves, resign, reuses CouncilPanel
  engine/
    stockfishWorker.js        UCI wrapper around Stockfish WASM worker
  lib/
    gameLogic.js              chess.js wrapper: moves, game-over detection
    council.js                fetch client for the council backend below
    games.js                  fetch client for /games (save, list, patch recap, ask); onUnauthorized -> signOut
    auth.jsx                  Google ID-token auth context/provider
    multiplayerSocket.js      shared socket.io-client singleton, sends idToken via handshake.auth
server/                       standalone Node backend, run separately
  index.js                    Express app + Socket.io on the same http server; runs migrate() on boot
  socket.js                   room create/join, authoritative move validation, resign/timeExpired, commentary + persistence on game-over
  rooms.js                    in-memory room Map, code generation, disconnect/cleanup bookkeeping
  gameEngine.js                server-side port of gameLogic.js + detectMoment (frontend/backend are separate packages)
  council.js                  Anthropic API calls + prompt building (getPing, getRecap, answerQuestion with askingColor)
  db.js                       pg pool, migrate()/saveGame()/updateGameRecap()/getGame()/listGames() — all ownership-checked against google_sub OR white_google_sub OR black_google_sub
  auth.js                     verifies Google ID tokens; requireAuth (Express) + reused directly in socket.js's io.use
  .env.example                copy to .env — ANTHROPIC_API_KEY, DATABASE_URL, GOOGLE_CLIENT_ID
.env.example                  root/frontend: VITE_GOOGLE_CLIENT_ID, VITE_COUNCIL_URL, VITE_SOCKET_URL (falls back to VITE_COUNCIL_URL)
```

## Running the council backend
The council needs a real Anthropic API key and can't run in the browser
(keys can't live in client JS), so it's a separate Node service from the
Vite frontend. First-time setup:
```
cd server
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY=
```
Then, from the project root, `npm run dev:all` starts both the frontend
(`:5173`) and the council backend (`:8787`) together in one terminal,
prefixed `[web]`/`[council]` (via `concurrently`). `npm run dev` still
works if you only want the frontend — the board just won't get any
commentary back. If the backend isn't running, or
`.env` has no key, `src/lib/council.js` fails soft — `pingCouncil`/
`recapCouncil` resolve to `null` instead of throwing, so the chess game
itself is completely unaffected either way; the council panel just stays
empty. This is deliberate: gameplay must never depend on the LLM call
succeeding.

### How the council decides when to speak
`Board.jsx`'s `detectMoment()` reacts only to three moment types, checked
in priority order (checkmate > check > capture) so a mating move doesn't
also fire a generic "check" reaction — kept deliberately narrow to control
per-game API cost. Live pings use Haiku (`claude-haiku-4-5-20251001`,
short/cheap); the post-game recap uses Sonnet (`claude-sonnet-5`, fuller
prose) and is requested once from the final PGN when `endGame` fires.
Blunder-flagging (eval swings after a move) was deliberately deferred —
it needs `stockfishWorker.js` to parse live `info ... score cp` lines,
not just `bestmove`, which is its own small feature to build later.

## Acceptance criteria (Phase 1 is "done" when all of these are true)
- [x] Board renders, pieces drag-and-drop, illegal moves snapback
- [x] Difficulty slider (Easy/Medium/Hard) selectable before game start,
      locked during play
- [x] Bot replies within ~1-2s at the selected difficulty
- [x] 10:00 clock per side, ticks down only on the side to move, pauses
      on game end
- [x] Flag-fall ends the game with the correct winner (not a draw)
- [ ] Checkmate / stalemate / draw all detected and shown with a correct,
      distinct message — logic reviewed, not exercised live yet
- [x] Finished game's PGN is visible and copyable, with real White/Black/
      Date/Result headers (not the chess.js defaults)
- [x] "New game" resets everything cleanly (fresh Board mount via the
      `gameKey` trick in App.jsx — don't try to reset chess.js in place,
      it's simpler to just remount)

## Explicitly out of scope for Phase 1 (do not add yet)
Real-time multiplayer/room codes, ElevenLabs voice, custom/uploaded piece
art, promotion-choice UI (always auto-promotes to queen for now).
LLM commentary ("the council") and Stage 2 (Google auth + Postgres game
log) were both pulled forward and are now implemented — see below.
Blunder detection for the council is still deferred.

## Stage 2 — Google auth + Postgres game log
Sign-in is entirely optional: guests can still play and get commentary,
they just don't get a saved history. `AuthProvider` in `src/lib/auth.jsx`
degrades to guest-only automatically when `VITE_GOOGLE_CLIENT_ID` isn't
set — `SignInButton` renders nothing, `GameHistory` renders nothing,
`App.jsx` just never calls `saveGame`. No code branches need touching to
run without Stage 2 configured.

**Auth approach, deliberately the lowest-complexity option**: Google
Identity Services' `<GoogleLogin>` button returns a signed ID token
(a JWT) directly to the browser. The backend verifies that token per
request with `google-auth-library`'s `verifyIdToken` (`server/auth.js`).
No sessions, no cookies, no server-side auth state, and — notably — no
client secret at all, since this flow only needs a Client ID, which is
meant to be public. That statelessness also means it fits serverless/
free hosting cleanly later. Trade-off knowingly accepted: the ID token
persisted in `localStorage` expires in ~1hr with no silent refresh, so a
long-idle tab needs a fresh sign-in — building refresh-token rotation
was judged not worth the complexity for an MVP.

**Setup** (both are one-time, external, and only the project owner can
do them — see the two setup blocks below):
1. Google Cloud Console → OAuth consent screen (External) → Credentials →
   OAuth Client ID (Web application) → add `http://localhost:5173` (and
   later the deployed frontend URL) under Authorized JavaScript origins.
   Put the resulting Client ID in **both**:
   - root `.env` → `VITE_GOOGLE_CLIENT_ID=` (frontend, public)
   - `server/.env` → `GOOGLE_CLIENT_ID=` (backend, verifies token audience)
2. Neon Postgres (or any Postgres) → grab the connection string → put it
   in `server/.env` → `DATABASE_URL=`. This one **is** a secret (it's a
   password-bearing connection string) — treat exactly like the
   Anthropic key: never paste it in chat, edit `server/.env` directly.

`server/db.js`'s `migrate()` runs on every backend boot and is just
`CREATE TABLE IF NOT EXISTS games (...)` plus `ADD COLUMN IF NOT EXISTS`
for later additions like `recap` — no migration framework, since Stage
2's persistence need is one table: PGN + result + difficulty + recap +
who played, keyed by the signer's Google `sub`. `GET/POST /games`,
`PATCH /games/:id` (attaches the async recap once ready), and
`POST /games/:id/ask` (per-game follow-up chat) all require a valid
bearer token (`requireAuth` middleware) and are scoped to the caller's
own `google_sub`; the council endpoints stay unauthenticated on purpose —
commentary isn't gated behind sign-in.

## Deployment — DONE
Stack, chosen for cost (~$0/month baseline) and low operational
complexity: Vercel for the static frontend, Render for the `server/`
Express + Socket.io backend, Neon for Postgres (same database local dev
already pointed at, so there was no dev/prod schema drift to discover at
deploy time). Live URLs and env var details are in the "Immediate resume
point" section at the top of this file.

Both CORS surfaces were locked down together, since they're genuinely
separate config — Express's `cors()` and the Socket.io server's own
`cors` option in `server/index.js` both now share one `allowedOrigins`
allowlist (env var `CLIENT_ORIGIN`, comma-separated) instead of the old
`origin: "*"`. `VITE_SOCKET_URL` was added as a Vercel env var alongside
`VITE_COUNCIL_URL` (client falls back to `VITE_COUNCIL_URL` if
`VITE_SOCKET_URL` isn't set — currently both point at the same Render
host, so the fallback isn't exercised but is there if they ever diverge).
The deployed frontend URL was added to the Google OAuth Client's
authorized JavaScript origins alongside localhost — confirmed with a
live sign-in on the deployed site.

**Not yet stress-tested**: the free-tier idle-sleep risk flagged when
this was still "next up" — Socket.io keep-alive traffic may not reliably
reset Render's idle timer, so a friend game with two slow-thinking
players carries some risk of a mid-game disconnect on the free tier.
Decision was to start on free tier anyway and only upgrade to Render's
Starter tier (~$7/mo, no sleep) if that turns out to be a real problem
in practice — still true, just now something to actually watch for
instead of a theoretical risk.
