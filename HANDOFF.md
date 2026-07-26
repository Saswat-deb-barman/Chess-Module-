# Chess by Alchemist — Handoff

A chess web app: play Stockfish solo, or play a friend in real time —
both modes get live LLM commentary during the game and a 5-persona
post-game analysis ("the Council") once it ends. Google sign-in is
optional; signed-in players get a persisted game history. As of
2026-07-25 the app also has a full visual identity — "The Green Room"
(green felt, aged cream, one rationed brass accent) — wired into every
real screen, not just proposed. As of 2026-07-26 signed-in players also
land on a dashboard (Learn: chess facts + a "Talk to the Council" chat,
Play: start a game, pending challenges, rivalries, match history, plus
restored trajectory/pattern feedback), friend-mode survives a brief
disconnect (CM-207), and the login screen's background is a growing
pool of curated art/photography.

This document is the single source of truth for where things stand:
what's built, what it looks like, how it's put together, and what's
still open. §§2–7 (Screens, Current status, Component list, Architecture,
Design system, Implementation notes) describe the app as of the Era 5
restyle (2026-07-25) and have not been re-verified line-by-line against
the Era 6 work below — treat §1's log as the authoritative record of
what changed most recently, and the rest of the doc as generally
accurate but not re-audited post-Era-6.

## Play it now

**[chess-module.vercel.app](https://chess-module.vercel.app)**

To play a friend: sign in with Google → **Play a friend** → **Create a
room** → send your friend the page URL with `?room=CODE` appended (shown
on the waiting screen) or just the code itself. They sign in, paste the
code (or open your link, which pre-fills it), and click join.

**Note:** the deployed site reflects `main` as of `77ebf41`
(2026-07-26) once Vercel/Render's next auto-deploy off `main` picks it
up — this hasn't been independently re-checked post-push (§8 item 2);
check the Vercel/Render dashboards if the live site looks behind.

---

## 1. Log — how this got built

Chronological, by era. Every entry below is a real commit on `main`
unless marked otherwise.

### Era 1 — MVP (2026-07-11)
- `5430e02` Initial commit: solo-vs-Stockfish + 1v1 friend multiplayer,
  live council commentary, working end to end.
- `44280e4`, `e9e326d` Deployment hardening: GitHub moved to a personal
  account after an org push failure, CORS locked to the deployed
  frontend + localhost.
- `f725a23` Chess Council module added: engine-flagged defining moves +
  the 5-persona post-game report, solo mode only at this point.

### Era 2 — Council hardening + friend-mode report (2026-07-12)
- `8b3db8c` Three real bugs fixed in the Council module: a UCI eval
  sign-convention error that silently inverted blunder/excellent-move
  classification, a React StrictMode ref-guard bug that looked like a
  hung async operation, and a Claude Sonnet 5 thinking-budget starvation
  issue (see §7, Implementation notes).
- `d397219` Council Report wired into friend mode too (previously
  solo-only).
- `cf79445` Version/env-var cleanup.
- `6dcbcbc` `version-updates/chess-council-review/` added — a
  standalone, paste-any-PGN sibling tool built around the same Council
  Score logic (see §5).

### Era 3 — Rebrand + Cycle 2 P0/P1 (2026-07-14, merged 2026-07-25 via PR #1)
- `2cbc49d` Renamed "Chess MVP" → **Chess by Alchemist** across the app;
  `docs/CHESS_MVP_PRD_CYCLE_2.md` and `docs/CHESS_MVP_UX_SPEC.md` added,
  scoping the next round of gameplay-feel fixes.
- `fa8d661` **CM-201**: the single most consequential bug fix in the
  project. `react-chessboard` never re-reads its `boardWidth` prop after
  mount; on any resize the board kept rendering at its stale pixel
  width, which silently put dragged pieces under the wrong square. Fixed
  with a `ResizeObserver` + `key={boardWidth}` remount pattern
  (`src/hooks/useBoardWidth.js`) — this exact pattern gets referenced
  and re-verified in every later phase that touches the board.
- `7c918dc` **CM-202 + CM-203**: turn indicator, legal-move dots on
  click, and a single move-application choke point shared by drag and
  click (so the two input paths can never diverge).
- `e2d70ff` **CM-204**: check alert — red king glow + a "Check." toast.
- `bba4c49` **CM-206**: council commentary rendered as side-colored
  bubbles (`CommentaryBubble.jsx`) instead of plain text.
- `0c863c9` **CM-205**: move-list rail with collapse/expand + read-only
  past-ply preview.
- `1eb8d99` **CM-208**: login-required routing — once Google auth is
  configured, guests see only the sign-in door, no guest play.
- **CM-207 (60-second disconnect grace) was scoped but never started —
  still open, see §8.**
- Merged to `main` 2026-07-25 as PR #1.

### Era 4 — The Green Room UX kit (built 2026-07-14, never merged)
A parallel, isolated design-system build on branch `design/green-room-kit`,
inside `version-updates/chess-app-ui-ux/` — per that module's own spec,
explicitly scoped as *"build the kit, not the screens."* Eight milestones,
each committed and live-verified separately:

| Commit | Milestone |
|---|---|
| `d913072` | module scaffold + token layer |
| `1a010eb` | primitives (§3), every state |
| `3b3a018` | chess primitives (§4) + a real playable local board |
| `ac51a70` | shell + landing + dashboard (§5.1–5.3) |
| `f3fc067` | game screen (§5.4) + the signature `TurnLamp` |
| `89ecb08` | analysis + council (§5.5–5.6) |
| `f3fd2a2` | motion, responsive, a11y (§8–10) |
| `4d32dfe` | acceptance checklist + module README |

This produced a full, self-contained `/kit` preview page (own dev
server, port 5175) showing every token/primitive/component in every
state, plus a real local two-player demo board. **This branch was never
merged into `main`** — it exists purely as reference material and a
built showcase. See §5 for exactly what's on it and how to run it.

### Era 5 — Promoting the design into the live game (2026-07-25, PR #2)
Once the kit was reviewed, the decision was made to bring its visual
language into the actual app (`src/`), not leave it as a side showcase.
New branch `restyle/green-room-promotion`, cut from `main` *after* PR
#1 (so it has the Cycle 2 fixes), seven phased commits — visual restyle
only, zero changes to auth/socket/game logic:

| Commit | Phase |
|---|---|
| `9bb1645` | RESTYLE-1: token foundation + setup screen |
| `c19db8a` | RESTYLE-2: chess primitives — pieces, board frame, highlights |
| `6db9662` | RESTYLE-3: TurnLamp, clock warn/alarm, check toast, resign/flip |
| `6a134e4` | RESTYLE-4: move rail (CSS-only) |
| `1e936d1` | RESTYLE-5: council commentary bubbles + defining-move tags |
| `f1f45fb` | RESTYLE-6: friend lobby, match history, sign-in (CSS-only) |
| `65f18b0` | RESTYLE-7: cross-cutting polish + final verification |

Merged to `main` as **PR #2** (`e858bf8`), 2026-07-25. Both
`restyle/green-room-promotion` (local + remote) and the superseded
`cycle2/cm-201-drag-offset-fix` remote branch were deleted after merge.
`design/green-room-kit` was deliberately left alone — still exists,
still not merged (see §8).

### Era 6 — Dashboard v1, rivalries/challenges, CM-207, and a rewrite (2026-07-25 to 2026-07-26, PR #4 + direct-to-`main` work)

The biggest single stretch of work on this app since the MVP. Built as
two waves on `feature/wave-2-3-frontdoor-rivalries` (merged as **PR #4**),
then several follow-on pieces committed straight to `main`.

**Wave 1 — the first real dashboard** (`b5e9e4f`…`1b30edd`, 14 phases):
`phase: "home"` as the signed-in landing screen, replacing the setup
screen as the front door. Built: `TrajectoryHeader` (plain-English
recent-form sentence), `ImprovementStrip` (up to 3 recurring mistake
patterns with sparklines, `server/patternTaxonomy.js`), a context-aware
`PrimaryCta`, `WorthReviewing` (games worth a second look, ranked
server-side), beginner/advanced analysis-mode switching
(`AnalysisModeProvider`, `user_settings` table), and `ReplayBoard` +
`BoardSurface` for ply-scrubbing a finished game's PGN. All of it reads
from `GET /me/stats`, a pure aggregate over already-classified game
rows — no new schema beyond `user_settings` and a `result_reason`
column.

**Wave 2/3 — rivalries, challenges, the Gemini sidecar** (`0c50307`…`c1c2e0a`,
11 phases): a `reserveRoom`/`resolveSeatForIdentity` primitive in
`rooms.js` so a challenge-accept can pre-seat two specific Google subs
before either has a live socket; a new `challenges` table and REST
routes (`POST /challenges`, `/accept`, `/decline`, `GET /me/challenges`);
`GET /me/rivalries` as a derived query over friend-mode games
(`computeRivalries`); a new isolated `server/gemini.js` sidecar
(`@google/genai`) generating a "from the literature" tile alongside the
existing Claude-based Council Report, merged concurrently and degrading
independently if either provider is down; `evalTrack` persistence so the
post-game eval graph (`EvalRibbon`/`RibbonBoard`) survives a page reload;
and a full login-screen restyle (`LoginScreen.jsx`,
`DecorativeReplayBoard.jsx`) replacing the bare sign-in button. Merged to
`main` as **PR #4**.

**Gemini literature tile, three real bugs fixed** (`585b522`, direct to
`main` per explicit instruction): wrong model (`gemini-2.5-pro` has zero
free-tier quota on a fresh project), a thinking-token starvation issue
(same class of bug as the documented Sonnet 5 one in §7 — fixed with
`thinkingConfig.thinkingBudget`), and intermittent malformed JSON output
(fixed with `responseMimeType: "application/json"`). Verified via 8+
consecutive successful isolated test calls plus a live end-to-end check.

**CM-207 — 60-second disconnect grace** (`f005296`, `5518a0e`, `25928dc`,
3 phases, merged to `main` `ce6e13b`): the item flagged as open in §8
below is now done. A socket disconnect in friend mode no longer ends the
game instantly — the room survives 60s (`armDisconnectGrace`/
`disarmDisconnectGrace` in `rooms.js`), both clients see a
`DisconnectBanner` countdown, a reconnect inside the window resyncs the
board via the existing `boardState` event and clears the banner, and
only the server declares the auto-resignation if the window elapses
(`getGameOverReason`'s new `disconnectedBy` case). Scoped deliberately
narrow: disconnect/reconnect while the tab stays open, not a full-reload
recovery (state lives in server memory, not Postgres) — both boundaries
stated explicitly in the plan, not silently assumed. The spec's "pause
the disconnected player's clock" requirement was dropped by informed
choice — friend mode has no clock at all, confirmed by direct code
inspection, and building one was explicitly out of scope for this
ticket.

**Login screen: drop-in backgrounds folder** (`afe3184`, `5a2765a`,
merged `400b68b`): `src/assets/login-backgrounds/` + a build-time glob
loader (`src/lib/loginBackgrounds.js`) — drop a static image or short
video loop in the folder and it joins the same random-pick pool as the
existing live decorative chess replay, no code change needed. First 10
images added (sourced from cdn.cosmos.so), screened before inclusion —
one skipped for a visible third-party watermark, one duplicate URL
skipped, one animated GIF recompressed 9.9MB → 2.4MB (halved frame
count, resized) since it was too heavy to ship as-is.

**`version-updates/chess-3d-engine/` scaffolded** (`e8c356d`): a new,
still-unbuilt module for a Three.js/orthographic-camera/GLTF-piece 3D
board renderer, generated with Gemini's help. Scaffold only — a
placeholder spinning cube proves the render loop/camera/dev server work;
waiting on the real scene/camera/model-loading files.

**Dashboard rewrite: learn/play split** (`d7640fe`, merged `2c2e23d`):
the Wave 1 dashboard was judged "boring" for a brand-new user — every
zone reads empty with no game history. Replaced entirely with two
sections: **Learn** (`LearnAboutChess.jsx` — a curated chess-facts card,
`src/lib/chessFacts.js` — and `TalkToCouncil.jsx`, a general chess Q&A
chatbot backed by a new `server/instructiveGames.js` curated-example
library, falling back to it when the asking user has no game history of
their own yet) and **Play** (start a game, pending challenges, match
history — unchanged capability, just recomposed). The `/me/stats` and
`/me/rivalries` endpoints and `server/stats.js` were deliberately left
running, dormant — not deleted, just disconnected from the UI.

**Dashboard nav + the dormant zones revived** (`77ebf41`, direct to
`main`): a persistent "← Dashboard" button, visible on every screen once
signed in (bot setup, an in-progress game, the friend lobby — none of
which previously had a way back except finishing a game). And the
Wave-1 zones dropped by the learn/play rewrite — `TrajectoryHeader`,
`ImprovementStrip`, `RivalriesRow`, `WorthReviewing` — restored from git
history and reconnected to the endpoints that were kept alive for
exactly this: trajectory/patterns/worth-reviewing joined "Learn"
(self-improvement feedback), rivalries joined "Play" (social/functional).
The dashboard is comprehensive again without losing the empty-state
handling that motivated the rewrite in the first place — every restored
zone still renders nothing until there's enough history to say something
real.

---

## 2. Screens

What actually renders, in the order a player encounters them. `App.jsx`
has no router — it's a single-page conditional-render state machine
(`topMode`, `phase`, `friendGame`).

1. **Auth gate** (`!canPlay`) — shown only when Google sign-in is
   configured and the visitor isn't signed in. Just the sign-in button
   and one line of copy. No guest play once auth is configured
   (CM-208).
2. **Setup screen** (`phase: "setup"`) — mode toggle (**Play the bot** /
   **Play a friend**), and for bot mode a difficulty track (Easy /
   Medium / Hard) plus **Start game**, the screen's one brass CTA.
3. **Friend lobby** (mode: friend, no `friendGame` yet) — three
   sub-screens inside `FriendLobby.jsx`: choose (Create a room / have a
   code?), waiting (large brass room code + shareable link), and
   join/joining (code entry form). A shared `?room=CODE` link drops a
   visitor straight into the join form, pre-filled.
4. **Board screen** (`phase: "playing"`) — `Board.jsx` (solo) or
   `MultiplayerBoard.jsx` (friend), structurally identical: clock pair,
   turn indicator with the `TurnLamp`, the board itself, resign/flip
   buttons, the move rail, and the live council commentary panel.
5. **Post-game** (`phase: "ended"`) — result heading, **New game**
   button, and the full 5-persona `CouncilReport` (defining-moves
   timeline + persona narration) once analysis finishes.
6. **Match history** (signed-in only, always visible below the
   above) — `GameHistory.jsx`: an expandable list of past games; each
   row opens to its recap, PGN, the same `CouncilReport` component
   reused from the live board, and a `GameChat` box to ask follow-up
   questions about that specific game.

---

## 3. Current status

| Piece | Status |
|---|---|
| Solo vs. bot | ✅ Done, verified live |
| Play a friend (real-time multiplayer) | ✅ Built, verified via simulated identities + local browser tabs — **not yet verified with two real humans on the live site since the restyle** |
| Live commentary (pings + recap), both modes | ✅ Built, wired, verified live |
| 5-persona Council Report, both modes | ✅ Built and verified; report styling re-verified after the restyle via DOM injection (no LLM backend running in the restyle session) |
| Deployment (GitHub → Vercel + Render, Neon DB, CORS, Google OAuth) | ✅ Done, verified live as of the Era 5 restyle — **not independently re-checked against Era 6's later pushes; confirm Vercel/Render picked up `77ebf41`** |
| Cycle 2 P0/P1 (CM-201 through CM-206, CM-208) | ✅ Done, merged (PR #1) |
| Cycle 2 P2 (CM-207, disconnect grace) | ✅ Done (Era 6) — 60s grace, reconnect, server-declared auto-resign. Untimed friend mode by design; not persisted across a full server restart (see Era 6 for the stated boundaries) |
| Green Room UX kit (`version-updates/chess-app-ui-ux/`) | ✅ Fully built, 8 milestones, on `design/green-room-kit` — **not merged, kept as reference only** |
| Green Room restyle of the live app | ✅ Done, merged (PR #2) — see §6 for known gaps |
| Dashboard (Wave 1 → learn/play rewrite → nav + zones restored) | ✅ Done (Era 6) — see Era 6 for the full arc; current shape is Learn (facts, council chat, trajectory, patterns, worth-reviewing) + Play (challenges, rivalries, start game, history) |
| Rivalries + challenge object (Wave 2/3) | ✅ Done, merged (PR #4) |
| Gemini literature sidecar | ✅ Done, three real bugs fixed post-merge (Era 6) |
| Login screen drop-in backgrounds | ✅ Done (Era 6) — 10 images in `src/assets/login-backgrounds/`, folder built to keep growing |
| `version-updates/chess-3d-engine/` | ⏳ Scaffolded only (Era 6) — waiting on real scene/camera/model files |

**Open items**, in priority order — see §8 for detail: (1) a real
two-human live playthrough (still never done, now also covering CM-207's
acceptance criteria), (2) confirm Vercel/Render actually deployed Era 6's
pushes, (3) `chess-3d-engine`'s real implementation once the fed-in files
arrive, (4) a decision on what to do with the now-orphaned
`design/green-room-kit` branch.

---

## 4. Final component list

### Shell
| File | Purpose |
|---|---|
| `src/App.jsx` | Top-level state machine — no router, just `topMode`/`phase`/`friendGame` conditionals |
| `src/App.css` | The single global stylesheet (902 lines post-restyle) — every color now a `var(--token)`, verified via grep |
| `src/main.jsx` | Entry point — wraps `<App/>` in `<AuthProvider>`, imports `styles/tokens.css` then `App.css` |
| `src/styles/tokens.css` | The Green Room's token layer — felt/paper/brass palette, type scale, spacing, radius, elevation, motion, ported verbatim from the kit |

### Setup & auth
| File | Purpose |
|---|---|
| `src/components/DifficultySelector.jsx` | Easy/Medium/Hard track, locks once a game starts |
| `src/components/SignInButton.jsx` | Wraps `@react-oauth/google`'s `GoogleLogin`; renders nothing if auth isn't configured |

### Board & game chrome (shared shape, solo vs. friend)
| File | Purpose |
|---|---|
| `src/components/Board.jsx` | Solo-vs-Stockfish screen: board, bot move loop, resign, Council Report trigger |
| `src/components/MultiplayerBoard.jsx` | Friend-mode screen: same shape, server-relayed moves instead of an engine |
| `src/components/chess/pieceSet.jsx` | `buildPieceSet()` — styled Unicode-glyph piece renderer with per-piece `aria-label`s, ported from the Green Room kit, replacing react-chessboard's default vector art |
| `src/components/MoveHighlightLayer.jsx` | Pure function (not a component despite the extension) — builds react-chessboard's `customSquareStyles` object for selection ring / move dot / capture ring / check glow, all token-driven |
| `src/components/Clock.jsx` | Two independent countdowns, ref-based 10×/sec tick, derives `warn`/`alarm` color+pulse state under 30s/10s |
| `src/components/TurnIndicator.jsx` | Text label pair ("Your move" / opponent status), now paired with a `TurnLamp` per side |
| `src/components/TurnLamp.jsx` | The Green Room's signature element — a small breathing-brass badge, exactly one lit at a time. Shows the side's color letter (W/B), not invented player identity, since core has no avatar/username data model |
| `src/components/CheckToast.jsx` | Single-purpose "Check." toast, 2s auto-dismiss, remounted via `key={fen}` per new check |
| `src/components/GameRail.jsx` | Collapsible tabbed rail (Moves tab only today), `localStorage`-persisted collapse state, 600px JS breakpoint |
| `src/components/RailToggle.jsx` | The rail's show/hide button |
| `src/components/MoveList.jsx` | Numbered SAN move pairs from `chess.js`'s own `history({verbose:true})`; click a past ply for a read-only preview |

### Council / commentary
| File | Purpose |
|---|---|
| `src/components/CouncilPanel.jsx` | Live in-game commentary feed — renders `CommentaryBubble`s + a one-line recap |
| `src/components/CommentaryBubble.jsx` | One council message. The deliberate "no pure black" exception: white-move comments get light bg/dark text, black-move comments get the reverse. Logs a live WCAG contrast ratio (reads tokens via `getComputedStyle`, not hardcoded hex) |
| `src/components/CouncilReport.jsx` | Post-game 5-persona breakdown + defining-moves timeline with classification tags (blunder/mistake/inaccuracy/excellent/normal), reused by both the live board and match history |

### Friend multiplayer & history
| File | Purpose |
|---|---|
| `src/components/FriendLobby.jsx` | Create/join a room over the socket; three internal sub-screens |
| `src/components/GameHistory.jsx` | Signed-in match history list (`GameRow` + nested `GameChat`, not separate files) |

### Hooks
| File | Purpose |
|---|---|
| `src/hooks/useBoardWidth.js` | The CM-201 fix — `ResizeObserver`-measured container width + remount key |
| `src/hooks/useLegalTargets.js` | Memoized verbose legal moves for the selected square |
| `src/hooks/useDocumentTitle.js` | Flashes "(1) Your move" in a backgrounded tab |
| `src/hooks/useCheckAlert.js` | Derives checked color/king square/checkmate from game state |

### Lib (frontend logic, no UI)
| File | Purpose |
|---|---|
| `src/lib/gameLogic.js` | `chess.js` wrapper: move application, game-over detection, PGN/FEN helpers |
| `src/lib/gameAnalysis.js` | Replays a finished PGN, classifies each move's eval swing, flags defining moves |
| `src/lib/council.js` | Fetch client for the council backend (ping/recap/report) |
| `src/lib/games.js` | Fetch client for `/games` (save, list, patch recap/report, ask); calls `onUnauthorized → signOut` on 401 |
| `src/lib/auth.jsx` | Google ID-token auth context/provider, degrades to guest-only automatically when unconfigured |
| `src/lib/multiplayerSocket.js` | Shared `socket.io-client` singleton, sends `idToken` via handshake auth |

### Engine
| File | Purpose |
|---|---|
| `src/engine/stockfishWorker.js` | UCI wrapper around the Stockfish WASM worker; `analyzePosition()` powers post-game eval |

### Server (`server/`, standalone Node package, run separately)
| File | Purpose |
|---|---|
| `index.js` | Express app + Socket.io on one HTTP server; runs `migrate()` on boot |
| `socket.js` | Room create/join, authoritative move validation, resign/timeExpired, commentary + report + persistence on game-over |
| `rooms.js` | In-memory room `Map`, code generation, disconnect/cleanup bookkeeping, `reportRequested` dedup flag |
| `gameEngine.js` | Server-side port of `gameLogic.js` + `detectMoment` — frontend/backend are separate packages, kept in sync by hand |
| `council.js` | Anthropic API calls + prompt building (`getPing`, `getRecap`, `getCouncilReport`, `answerQuestion`) |
| `db.js` | `pg` pool, `migrate()`/`saveGame()`/`updateGameRecap()`/`updateGameCouncilReport()`/`getGame()`/`listGames()` — ownership-checked |
| `auth.js` | Verifies Google ID tokens; `requireAuth` (Express) + reused directly in `socket.js`'s `io.use` |

---

## 5. Whole app architecture

```
Chess MVP/                          (repo root — git remote: Saswat-deb-barman/Chess-Module-)
├── src/                            live frontend — see §4 for every file
├── server/                         live backend, standalone package — see §4
├── docs/
│   ├── CHESS_MVP_PRD_CYCLE_2.md    Cycle 2 scope (drag fix, turn indicator, etc.)
│   └── CHESS_MVP_UX_SPEC.md        v0.1 UX spec Cycle 2 extends
├── HANDOFF.md                      this file
├── CLAUDE.md                       working conventions — core vs. version-updates split
├── index.html                      Vite shell; Fraunces + Instrument Sans Google Fonts links
├── package.json                    frontend deps + scripts (dev, dev:all, build)
└── version-updates/                self-contained experiments — see CLAUDE.md's convention:
    │                                nothing here imports from or modifies core, promotion is
    │                                always a deliberate separate decision
    ├── chess-council-review/       standalone paste-a-PGN tool (own dev server, port 5174) —
    │                                engine-flagged defining moves + the 5-persona report, not
    │                                tied to any specific game source
    └── chess-app-ui-ux/            on `main`: an OLDER, unrelated dark-cinematic prototype
                                     (reference material only, never built out). The REAL Green
                                     Room kit lives only on branch `design/green-room-kit` — see
                                     §1 Era 4 and §6 below. Do not confuse the two.
```

### Data flow, solo mode
`Board.jsx` owns a `chess.js` `Game` instance in a ref. A move (drag or
click) funnels through one `applyMove()` choke point → local state
update → `firePing()` (fire-and-forget LLM call for check/capture/mate
moments, `lib/council.js`) → if the game continues, `requestBotMove()`
asks the in-browser Stockfish worker for a move and applies it the same
way. On game end: PGN saved (if signed in), a one-line recap requested,
then `runCouncilAnalysis()` runs the client-side engine analysis
(`gameAnalysis.js`) and requests the 5-persona report — both patched
onto the already-saved game row as they resolve.

### Data flow, friend mode
`MultiplayerBoard.jsx` keeps its own local `chess.js` instance for
optimistic rendering, but **the server is authoritative** — every move
is emitted over the socket, validated server-side (`gameEngine.js`),
and the canonical `boardState` FEN is broadcast back. Council pings and
the recap are server-triggered (not client-triggered like solo mode).
The post-game report is special: the server has no working Stockfish
(see §7), so *both* clients independently run the same browser-side
`gameAnalysis.js` and submit their result — `rooms.js`'s
`reportRequested` flag ensures only the first submission actually
triggers the LLM call, and the result is broadcast to both regardless
of which one "won."

### Auth
`AuthProvider` (`lib/auth.jsx`) wraps the whole app. With
`VITE_GOOGLE_CLIENT_ID` unset, it's a no-op — the app runs exactly as
it did before auth existed, guest-only, no gate. With it set,
`GoogleLogin` produces an ID token stored in `localStorage`; every
authenticated fetch/socket call sends that token, and the server
verifies it (`server/auth.js`) rather than trusting the client.

### Design token flow
`src/styles/tokens.css` (CSS custom properties) is imported once, in
`main.jsx`, before `App.css`. Every color in `App.css` is a
`var(--token)` reference — verified via `grep -nE "#[0-9a-fA-F]{3,6}"
src/App.css` returning zero matches. The two places that can't just
reference a CSS variable (react-chessboard's inline `customSquareStyles`
object, and `CommentaryBubble.jsx`'s WCAG contrast-ratio math, which
needs a resolved hex string) either write `var(--token)` directly into
an inline style object (works fine — browsers resolve `var()` in
inline styles same as in a stylesheet) or read the token via
`getComputedStyle(document.documentElement).getPropertyValue(...)` at
the one point actual math is needed.

---

## 6. Design system — "The Green Room"

Palette: green felt surfaces (`--felt-950` through `--felt-700`), aged
cream text (`--paper-50` through `--paper-500`), one rationed brass
accent (`--brass-500`, one real call-to-action per screen — not every
button), semantic win/loss/alarm/warn colors, and dedicated board-square
tokens (`--sq-dark`, `--sq-light`, `--sq-select`, `--sq-dot`, `--sq-check`,
etc.). Type: Fraunces (display serif) + Instrument Sans (UI), both via
Google Fonts `<link>` tags in `index.html`. Motion: a 2.4s breathing
pulse on the active `TurnLamp`, a 1s pulse on a critically-low clock,
both killed under `prefers-reduced-motion: reduce`.

**Where things actually live** (this trips people up, read carefully):
- The **built kit** — a `/kit` showcase page with every token/primitive
  in every state, plus a real playable demo board — exists only on
  branch `design/green-room-kit`, inside
  `version-updates/chess-app-ui-ux/`. `cd` into that directory on that
  branch, `npm install && npm run dev` (port 5175) to see it. **This
  branch was never merged to `main`.**
- The **live app's actual styling** was hand-ported from that kit into
  core `src/` on a *different* branch (`restyle/green-room-promotion`,
  cut from `main` after PR #1), which *was* merged (PR #2, §1 Era 5).
  Core doesn't import anything from the kit module — every token and
  component pattern was manually re-implemented against the live app's
  real props/state, per this repo's convention that core and
  version-updates never share code.

### Known, deliberate deviations from the kit (all called out in the
restyle's own commit messages)
- **Pieces**: styled Unicode glyphs, not vector art — matches the kit
  exactly, an intentional choice over react-chessboard's default piece
  images (confirmed with the project owner before building).
- **Board frame uses `box-shadow`, not a real `border`.**
  `useBoardWidth`'s `ResizeObserver` measures `.board-wrap`'s own
  `getBoundingClientRect()`, and the Chessboard is rendered at exactly
  that measured width — a real border would add 12px to the measured
  box without adding matching content-area room, overflowing the board
  past its own frame on every resize. `box-shadow` paints without
  touching the box model.
- **`TurnLamp` shows a color letter (W/B), not a real avatar/initials** —
  core has no per-player username/avatar data model today, so this
  doesn't invent identity data that doesn't exist.
- **The move rail kept its existing single 600px JS-breakpoint collapse
  behavior** rather than adopting the kit's 3-tier responsive system
  (push panel / spine-overlay / bottom sheet) — that's a real
  interaction-model change, not a reskin, and was deliberately scoped
  out of a "visual restyle" pass.
- **`PromotionPicker`/`ArrowLayer` from the kit were not ported** —
  both represent new interaction behavior (`gameLogic.js`'s `tryMove`
  still hardcodes queen promotion) that the kit has but the live app's
  logic doesn't, and porting them would have violated the restyle's
  own logic-freeze rule.
- **5 defining-move classification colors vs. the kit's 3** — the kit's
  own move-quality scale only has blunder/mistake/good; `inaccuracy`
  and `normal` were extrapolated (inaccuracy: same warn hue as mistake,
  lower-emphasis neutral tag; normal: the pre-existing neutral
  treatment, unchanged) since there's no exact kit precedent for either.

---

## 7. Implementation notes worth knowing before touching this code

- **UCI eval sign convention**: Stockfish's `score cp` is always from
  the perspective of whoever is *to move* in the position just sent,
  which alternates every ply regardless of who made the move.
  `gameAnalysis.js` flips sign specifically when White was the mover.
  Getting this backwards silently inverts every blunder/excellent-move
  classification without erroring.
- **React StrictMode + refs that track unmount**: any `useRef` set to
  `true` in an effect's cleanup and read as a guard elsewhere must be
  reset to `false` at the top of the *same* effect, not just declared
  once via `useRef(false)`. StrictMode's dev-mode double-invoke
  otherwise poisons the guard permanently after the first cleanup —
  looks exactly like a hung async operation. Both `Board.jsx` and
  `MultiplayerBoard.jsx` reset their `unmountedRef` this way.
- **Claude Sonnet 5 defaults to adaptive thinking when `thinking` is
  omitted.** For a fixed, small `max_tokens` budget on a complex
  prompt, this can consume the entire budget on thinking before
  producing output text. `server/council.js`'s `getCouncilReport` sets
  `thinking: { type: "disabled" }` explicitly.
- **Server-side Stockfish in Node doesn't work** (at least not the
  `stockfish` npm package's WASM build, tested Node version) — stalls
  after the engine's first output line either in-process or as a child
  process. Not investigated further: defining-move analysis for
  friend-mode games instead runs client-side in `MultiplayerBoard.jsx`
  (mirroring solo mode), guarded server-side against duplicate
  submissions via `rooms.js`'s `reportRequested` flag.
- **Frontend and backend are separate npm packages** with some logic
  deliberately duplicated across the boundary (`gameLogic.js` /
  `gameEngine.js`). Keep both in sync if either changes.
- **No reconnect/rejoin-by-token mechanism** for friend mode — a page
  refresh mid-game currently forfeits your seat. Deliberately deferred
  (this is exactly what CM-207 was scoped to fix — see §8).
- **`useBoardWidth`'s measured element can't be one whose size the
  measurement itself drives.** Discovered twice this project (once in
  the Green Room kit build, once informing the RESTYLE-2 board-frame
  CSS decision above): if the ref target is `inline-block` with no own
  width, it shrink-wraps to its content — which is the very Chessboard
  being sized from this measurement — a closed loop that collapses
  toward zero on first paint. The fix is always the same shape: give
  the *enclosing* wrapper a width from CSS (or, for `.board-wrap`
  itself, avoid adding anything — border included — that changes its
  box model).
- **CSS specificity trap, found live during the restyle**: a blanket
  `.friend-lobby p { color: ...}` rule (added for one unstyled bare
  `<p>`) silently overrode the more-specific-looking-but-lower-
  specificity `.room-code` class rule, since two-simple-selectors beats
  one regardless of source order. Caught via a DOM-injection visual
  check, not code review. Worth grep-checking for similar collisions
  (`class + type-selector` vs. `single class`) if `App.css` grows
  further.
- **GitHub push access is per-account, not per-repo-visibility.** This
  session's `gh`/git session authenticated as a *different* GitHub
  account (`saswat-debug`) than the repo owner (`Saswat-deb-barman`) —
  read access doesn't imply write access, and a pending collaborator
  invite has to be explicitly accepted (`gh api -X PATCH
  /user/repository_invitations/<id>`) before pushes/PRs work. Cost two
  rounds of back-and-forth this session; check `gh auth status` and
  repo `permissions.push` early if push ever fails with a 403.

---

## 8. Open items / what's next

1. **A real two-human live playthrough.** Sign in as two different
   Google accounts in two real tabs on the deployed site, play a full
   friend game including a capture/check, reach checkmate or resign,
   confirm both dashboards show the game with the correct opponent, the
   Council Report renders for both, each can ask their own follow-up
   question — and now also CM-207's own acceptance criteria (kill one
   client's network for 30s, confirm resume; kill it for 65s, confirm
   the server declares the resignation). Needs a real second Google
   account, which is why it's never been done from an automated browser
   — every verification so far, across every era including CM-207's own,
   has used simulated identities, local tabs, or DOM injection instead.
   This is the single most load-bearing gap in this doc.
2. **Vercel/Render deploy check.** Confirm both the frontend and backend
   actually picked up Era 6's pushes (last confirmed push: `77ebf41`) —
   auto-deploy on push is configured for both, but hasn't been
   independently re-checked since the PR #2 merge.
3. **`chess-3d-engine`'s real implementation.** Scaffolded only (Era
   6) — waiting on the actual scene/camera/model-loading files plus the
   Gemini `.md` spec describing the piece-generation approach.
   Independent of core; no risk to the live game either way.
4. **`design/green-room-kit` branch's fate.** It's fully built (8
   milestones, live-verified, has its own README) but was deliberately
   never merged — it was reference material for the restyle, not a
   thing meant to ship on its own. Decide: delete it (the design
   language it documents now lives in `main` anyway, restated in §6
   above), keep it parked as living reference documentation, or merge
   it in as-is for historical record. No action taken either way as of
   this handoff.
5. **CM-207's stated boundaries, if they ever stop being acceptable.**
   Room state lives in server memory, not Postgres — a full server
   restart mid-game still loses the room, same as every other in-flight
   game before this ticket. A full-page-reload recovery (not just a
   socket drop) is also out of scope as shipped. Both were explicit,
   stated tradeoffs, not oversights — revisit only if real usage makes
   either one actually bite.
6. **Font hosting.** Fraunces + Instrument Sans currently load from the
   Google Fonts CDN (a third-party request on every page load) — fine
   for now, flagged as a "revisit if it ever matters" item, not a
   blocker.

---

## 9. Running locally

```
cp .env.example .env                      # fill in VITE_GOOGLE_CLIENT_ID
cd server && cp .env.example .env         # fill in ANTHROPIC_API_KEY, DATABASE_URL, GOOGLE_CLIENT_ID
cd ..
npm run dev:all                           # starts both servers, open http://localhost:5173
```

Both the council LLM calls and the Postgres persistence fail soft — if
`ANTHROPIC_API_KEY` or `DATABASE_URL` aren't set, the chess game itself
is completely unaffected, the relevant UI just stays empty. Sign-in
degrades to guest-only automatically when `VITE_GOOGLE_CLIENT_ID` isn't
set (this is also the fastest way to browse the restyled UI without a
real Google account — set `VITE_GOOGLE_CLIENT_ID=` empty in a gitignored
`.env.local`, which overrides `.env`, then restart the dev server).

To see the (unmerged) Green Room kit showcase instead of the live app:
```
git checkout design/green-room-kit
cd version-updates/chess-app-ui-ux
npm install && npm run dev                # http://localhost:5175
```

---

## 10. Deployment

| Service | What | Notes |
|---|---|---|
| GitHub | [Saswat-deb-barman/Chess-Module-](https://github.com/Saswat-deb-barman/Chess-Module-) | Personal account (not an org) |
| Vercel | [chess-module.vercel.app](https://chess-module.vercel.app) | Frontend, auto-deploys on push to `main`. Env vars: `VITE_GOOGLE_CLIENT_ID`, `VITE_COUNCIL_URL`, `VITE_SOCKET_URL` |
| Render | `chess-mvp-server.onrender.com` | Backend, root dir `server`, start command `node index.js` (no `npm start` script exists — must be set explicitly), free tier, auto-deploys on push. Env vars: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `GOOGLE_CLIENT_ID` |
| Neon | Postgres | Same DB local dev points at — no dev/prod schema drift |

**CORS**: `server/index.js` reads an `allowedOrigins` allowlist (env var
`CLIENT_ORIGIN`, comma-separated, defaults to
`http://localhost:5173,https://chess-module.vercel.app`), shared between
Express's `cors()` and the Socket.io server's own `cors` option.

**Google OAuth**: the deployed frontend URL is added to the OAuth
Client's Authorized JavaScript origins (Console → Credentials), alongside
localhost.
1. `http://localhost:5173` (and the deployed URL) must be under
   **Authorized JavaScript origins**, not Authorized redirect URIs —
   this app's `<GoogleLogin>` flow never redirects.
2. The OAuth consent screen defaults to **Testing** publishing status,
   which silently blocks *all* sign-ins, including the developer's own
   account, unless that account is added under **Test users**.

**Known risk, accepted, not yet stress-tested**: Render's free tier
idle-sleeps, and Socket.io keep-alive traffic may not reliably reset
that timer — a friend game with two slow-thinking players carries some
risk of a mid-game disconnect. Upgrade to Render's Starter tier
(~$7/mo, no sleep) only if this turns out to be a real problem.

---

## 11. Verification approach for anything behind Google sign-in

Automated test browsers have no signed-in identity, and the auth gate
correctly blocks guest sockets from creating/joining friend rooms. The
approach used throughout this project: exercise the same underlying
functions `socket.js`/`index.js` call (`createRoom`, `saveGame`,
`getPing`, `getRecap`, `getCouncilReport`, `updateGameCouncilReport`,
etc.) directly with simulated identities — including, for the
friend-mode Council Report dedup guard, replicating the exact handler
logic under a real `Promise.all` race to prove only one LLM call fires.
For the restyle specifically, components that need real backend state
(council pings, match history) were instead verified by injecting
realistic markup directly into the live DOM and checking computed
styles — good enough to catch real bugs (see §7's CSS specificity trap)
without needing the full backend running. Test rows get cleaned up from
the real Neon DB afterward.

## 12. Anthropic API usage in this project

- Live pings: `claude-haiku-4-5-20251001`, short/cheap, fired on
  checkmate/check/capture only (checked in that priority order so a
  mating move doesn't also fire a generic "check" reaction).
- One-line recap: `claude-sonnet-5`, once per finished game.
- 5-persona Council Report: `claude-sonnet-5`, once per finished game,
  single call (not 5 separate persona calls) with a strict-JSON
  response contract, `thinking` disabled (see §7).
- All three fail soft to `null`/empty — an LLM outage never blocks or
  breaks gameplay.
