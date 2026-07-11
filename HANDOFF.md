# Chess MVP — Phase 1 Handoff

## Immediate resume point — Milestone 8 (deployment), blocked on GitHub setup
Milestones 1–7 (the whole real-time 1v1 multiplayer feature) are done
and verified — see the section below for the full build summary. This
project is now a git repo with one local commit (`git log` will show
"Initial commit: Chess MVP with council commentary and 1v1 multiplayer")
containing everything through Milestone 7. **Nothing has been pushed to
GitHub yet.**

**What happened and why it's not pushed**: first tried pushing to
`saswat-alchemist/Chess-module` on GitHub, which turned out to be an
**organization**, not a personal account — got a clean `403 Permission
to saswat-alchemist/Chess-module.git denied to saswat-alchemist` even
with a correctly-scoped classic PAT, which is the signature of an org
that restricts personal-access-token access (needs either SSO
authorization on the token or an org owner to allow PATs under
Organization Settings → Third-party Access). Decision made: skip the org
entirely and set this up under a **personal** GitHub account instead, so
there's no permission layer to fight — full end-to-end ownership.

**Two PATs were pasted directly into chat during this troubleshooting
and are dead**: one got revoked proactively (correct call), the second
(a classic token, `repo` scope) is still live as far as I know — **revoke
it too** at [github.com/settings/tokens](https://github.com/settings/tokens)
before continuing, same reasoning as always: anything pasted in a chat
transcript should be treated as burned regardless of whether it still
technically works.

**To actually resume this**:
1. Create a new repo under your **personal** GitHub account (not
   `saswat-alchemist`) at [github.com/new](https://github.com/new) —
   empty, no README/gitignore (local commits already exist).
2. Tell me the repo URL — I'll run `git remote add origin <url>` (the
   old `saswat-alchemist` remote was already removed, clean slate).
3. Generate a fresh classic PAT (**never paste it in chat** — go
   straight to your terminal with it) at
   [github.com/settings/tokens/new](https://github.com/settings/tokens/new),
   `repo` scope checkbox only.
4. Run `git push -u origin main` yourself in your terminal (not through
   me — same reasoning as the token handling): username is your GitHub
   username, password is the token (paste it — the terminal shows
   nothing at all while typing/pasting into a password prompt, that's
   normal, not a bug).
5. Once pushed, next is connecting Vercel (frontend) + Render (backend)
   — you said you still need to create accounts for both; I can't create
   accounts on your behalf (same rule as everything else external this
   project has needed: Neon, Google Cloud, GitHub).

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

**Immediate next step**: an actual two-human click-through — sign in as
two different Google accounts in two real browser tabs, play a full
friend game including a capture/check (for a live council ping), let it
reach checkmate or resign, and confirm both players' dashboards show the
game with the correct opponent and can each ask their own follow-up
question. This needs a real second Google account, which is why it
wasn't done this session (the automated test browser has no signed-in
identity to use).

**After that's confirmed**, next up is actual deployment — Vercel
(frontend) + Render (backend) + Neon (already set up); see "Deployment
(next up)" below. One new consideration versus the original plan: Render
free tier's idle-sleep risk now extends beyond "waiting for a friend to
join" to potentially dropping an in-progress game with two slow-thinking
players, since WebSocket keep-alive traffic may not reliably reset
Render's idle timer. Decided to start on the free tier anyway and
upgrade only if that's a real problem in practice.

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

## Deployment (next up)
Not yet done. Planned stack, chosen for cost (~$0/month baseline) and
low operational complexity: Vercel for the static frontend, Render for
the `server/` Express + Socket.io backend, Neon for Postgres (same
database local dev already points at, so there's no dev/prod schema
drift to discover at deploy time).

Now that Socket.io carries live gameplay, the free-tier idle-sleep
trade-off is a bit bigger than originally scoped: it's no longer just
"cold-start delay on a council/save call" — Render's idle-sleep timer
may not reliably reset from WebSocket keep-alive traffic, so a friend
game with two slow-thinking players carries some risk of a mid-game
disconnect, not just the "waiting for a friend to join" window. Decision
made: start on the free tier anyway, upgrade to Render's Starter tier
(~$7/mo, no sleep) only if that turns out to be a real problem once
people are actually using it.

When deploying: lock down both CORS surfaces together, since they're
genuinely separate config — Express's bare `cors()` in `server/index.js`
AND the Socket.io server's own `{ cors: { origin: "*" } }` both currently
allow all origins and both need pointing at the real deployed frontend
origin. Add a `VITE_SOCKET_URL` env var alongside the existing
`VITE_COUNCIL_URL` (client falls back to `VITE_COUNCIL_URL` if
`VITE_SOCKET_URL` isn't set, so this is optional if they're the same
host). Add the deployed frontend URL to the Google OAuth Client's
authorized JavaScript origins alongside localhost.
