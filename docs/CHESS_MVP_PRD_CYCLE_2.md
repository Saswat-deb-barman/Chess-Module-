# PRD — chess-mvp, Build Cycle 2

**Status:** ready for Claude Code
**Date:** 13 July 2026
**Supersedes:** nothing. Extends `CHESS_MVP_UX_SPEC.md` v0.1
**Theme of this cycle:** *make the board feel like a real board.*

Cycle 1 proved the game module works. Cycle 2 is about the twenty small things that
separate "a chess program" from "a chess game." A player currently cannot tell whose turn it
is, cannot see where a piece may go, is not told when they are in check, and the piece leaves
the board when they drag it. Every one of those is a trust bug. Fix them before adding a
single new feature.

---

## 1. Decisions locked (previously open forks)

| # | Fork | Decision |
|---|---|---|
| 1 | Guest play | **No.** Login required. One common landing page for everyone. Signed out sees sign-in. Signed in redirects to the dashboard |
| 2 | Council as in-game advisor | **Off entirely.** No hints, no consults, no move suggestions during play |
| 3 | Disconnect behaviour | **Room survives 60 seconds.** Then the server declares a resignation |
| 4 | Rating | **Head-to-head only.** No Elo. No rating column. The league table is computed from the games table |

## 2. One contradiction, resolved

Fork 2 says the council is off. Feature request 7 asks for council comment boxes.

**The line:** the council is off as an **advisor** and on as a **commentator**.

- It never talks *to* you during a game. No hints. No "there is something on the kingside."
- It talks *about* the game. It comments on moves that have already been played, for both sides.
- A commentator cannot help you win. An advisor can. That is the whole distinction and it is
  the reason one is banned and the other is not.

If that reading is wrong, say so before CM-206 gets built, because it changes the component.

---

## 3. Scope

| ID | Title | Priority |
|---|---|---|
| CM-201 | Fix drag offset (piece renders off-board) | **P0 — blocker** |
| CM-202 | "Your move" indicator | P0 |
| CM-203 | Legal move dots on piece click | P0 |
| CM-204 | Check alert to the opponent | P1 |
| CM-205 | Move list + rail toggle | P1 |
| CM-207 | 60-second disconnect grace | P1 |
| CM-208 | Login-required routing | P1 |
| CM-206 | Council commentary boxes (side-coloured) | P2 |

P0 items are trust bugs. Nothing else ships until all three are closed.

---

## CM-201 — Fix drag offset

**Priority:** P0. This blocks the cycle.

**Symptom:** while dragging, the piece renders roughly three squares away from where it should
be, outside the board.

**Cause:** this is a known class of bug in `react-chessboard`. It is one of the following.
Check them in this order, because they are ordered by how often they are the answer.

1. **A CSS `transform`, `scale`, `zoom` or `filter` on any ancestor of the board.** A
   transformed ancestor creates a new containing block, and the drag layer positions the piece
   using viewport coordinates. The offset math then lands somewhere else entirely. Three squares
   is exactly the flavour of wrongness this produces. **Check this first.** Grep the whole
   ancestor chain, including anything applied by a page-load animation.
2. **`boardWidth` does not match the container's real rendered width.** If a fixed
   `boardWidth={560}` is passed but CSS constrains the board to something narrower, every drag
   coordinate is computed against the wrong grid. Fix by measuring the container with a
   `ResizeObserver` and passing the measured number, or by dropping the prop and letting the
   board size itself.
3. **Scroll or `position: fixed` ancestor** whose offset the drag layer does not account for.
4. **A custom drag layer portalled into the wrong DOM parent.** It belongs on `document.body`.
5. **Version mismatch.** react-chessboard v4 and v5 have different drag implementations.
   Confirm the installed version in `package.json` and read *that* version's docs.

**The one measurement that identifies it (do this before writing any fix):**

```js
console.log('boardWidth prop:', boardWidth);
console.log('container:', containerRef.current.getBoundingClientRect().width);
```

**If those two numbers differ, cause 2 is the bug and you are done diagnosing.** If they match,
it is cause 1. Print both numbers into the transcript before claiming a fix.

**Acceptance criteria**
- Dragged piece sits under the cursor at viewport widths 390, 768 and 1440.
- Dragged piece sits under the cursor at browser zoom 100% and 125%.
- Still correct after the board is flipped.
- Still correct **immediately after toggling the rail** (see CM-205). This is the regression that
  will come back.

---

## CM-202 — "Your move" indicator

**Priority:** P0
**User story:** I always know, without thinking, whether the board is waiting for me.

**Behaviour**
- The active player's `PlayerCard` takes a live state: a ring on the avatar and a label.
  Yours reads **"Your move."** Theirs reads **"Waiting for DJ."**
- The board itself takes a subtle active border tint when it is your turn.
- When the tab is not focused and it becomes your move, the document title becomes
  `(1) Your move · chess-mvp`. Restore on focus.
- Bot mode: while Stockfish computes, the bot card reads **"Thinking…"**.

**Implementation**
- New `TurnIndicator`, lives inside `PlayerCard`.
- Drive it from `chess.turn()` plus the local player's colour. **Do not track turn in separate
  React state.** One source of truth or it will desync in live games.

**Acceptance criteria**
- At every moment of a live game, exactly one card shows the active state. Never zero. Never two.
- Both clear on game end.
- Correct after a board flip.
- Correct on reconnect (CM-207): a player who rejoins immediately sees whose move it is.

---

## CM-203 — Legal move dots on piece click

**Priority:** P0
**User story:** I click a piece and the board shows me where it can go.

**Behaviour**
- Click or tap one of your pieces, on your turn. The source square highlights. Legal targets
  render: a small centred dot on empty squares, a ring or cut corners on capturable squares.
- Click the same piece again, or click a non-target square, to deselect.
- Click a legal target to play the move.
- **Click-to-move must coexist with drag-to-move.** Both routes call the same move handler.
  Two separate move paths is how an illegal move eventually gets through.
- Only your own pieces, only on your turn.

**Implementation**
- Source the targets from `chess.moves({ square, verbose: true })`. chess.js already handles pins,
  check resolution, castling and en passant. Do not reimplement any of that.
- Castling renders as the king's two-square target. En passant renders as a capture.
- New: `useLegalTargets(square)` hook, `MoveHighlightLayer` component.

**Acceptance criteria (all falsifiable, test them)**
- Click a **pinned** knight: zero targets render.
- **In check**, click a non-king piece: only the moves that resolve the check render.
- Castling available: the king shows the two-square target.
- The same move played by click and by drag produces an identical move object.
- Clicking an opponent piece on your turn does nothing.

---

## CM-204 — Check alert

**Priority:** P1
**User story:** I am never surprised to discover I was in check.

**Behaviour**
- When a move delivers check, the checked king's square takes a red radial glow. It persists for
  as long as the king is in check, and clears the instant check is resolved.
- A single toast fires **for the player being checked**: "Check." The player giving check gets
  nothing. They already know.
- Optional sound, off by default, tied to the same mute control as voice.
- Checkmate is a separate treatment: the glow goes solid and `GameOverModal` fires.

**Implementation**
- Drive from `chess.inCheck()` after the move lands. **Do not derive it from the moving piece**,
  or discovered checks will silently fail to alert.
- New: `CheckIndicator`.

**Acceptance criteria**
- Glow appears within one animation frame of the move landing.
- Fires in bot mode when the bot checks you.
- A **discovered check** fires identically to a direct check. Test this one specifically.
- Glow clears on the move that resolves the check.

---

## CM-205 — Move list and rail toggle

**Priority:** P1
**User story:** I can open a register of the game at any moment and close it when I want the board bigger.

**Behaviour**
- `RailToggle`: a button that collapses and expands the right rail. State persists per user in
  localStorage. Default: expanded on desktop, collapsed on mobile.
- `MoveList`: numbered move pairs in SAN, two columns, the current ply highlighted, auto-scrolled
  to the latest move.
- Copy-PGN button stays where it is.
- **Clicking a ply during a live game does not rewind the live board.** It opens a read-only
  preview of that position with a "Back to live" button. A player must never be able to scrub the
  board and then move from the wrong position.
- With the council off in-game, the rail in this cycle carries **Moves** and, in live mode, **Talk**.

**Acceptance criteria**
- The move list is never more than one move behind the board.
- **Toggling the rail must not break drag.** The board container resizes when the rail opens or
  closes. If `boardWidth` is a stale constant, CM-201 comes straight back. Wire a `ResizeObserver`,
  then test a drag immediately after every toggle. This is the single most likely regression in
  the cycle.
- Preview mode cannot submit a move. Try to. It must refuse.

---

## CM-206 — Council commentary boxes

**Priority:** P2
**Constraint:** commentary only. No advice. See section 2.

**Behaviour**
- New shared component: `CommentaryBubble`, takes `side: 'w' | 'b'`.
- Comment on a **white** move: light background, near-black text.
- Comment on a **black** move: near-black background, light text.
- **Both bubbles carry a thin border.** Without it the white box vanishes on a light surface and
  the black box vanishes on a dark one. The border is not decoration, it is what makes the
  scheme survive both themes.
- Each bubble carries the speaking coach's avatar and name.

**Used in two places**
1. `CommentaryFeed` in the game rail (feed generation itself is a later cycle).
2. `CouncilVerdicts` and `CriticalMoments` on the analysis screen.

Build the component now. Both consumers inherit it.

**Acceptance criteria**
- Render a strip of ten alternating comments. Screenshot it. Both types legible.
- **Print the measured contrast ratio for both bubbles.** Both must clear 4.5:1. A number in the
  transcript, not an opinion.

---

## CM-207 — 60-second disconnect grace

**Priority:** P1
**Decision:** fork 3, locked.

**Behaviour**
- A socket disconnect does not kill the room. The room stays alive for 60 seconds.
- Both clients show `DisconnectBanner`: **"DJ disconnected. Auto-resign in 0:47."** Counting down.
- Reconnect inside the window: banner clears, the game resumes **from server state**.
- At zero: the **server** declares the resignation and writes the result. Never the client. A
  client-side timer can be beaten by closing the tab.
- **The disconnected player's clock pauses during the grace window.** Otherwise a 60-second grace
  is meaningless in a 5+0 game and the player is punished twice for one disconnect. This is an
  assumption. Overrule it if you disagree.

**Architectural consequence, flagged loudly**
This decision means **game state cannot live only in server memory.** A reconnecting client must
be able to ask the server for the authoritative position. Room state goes to Postgres, or at
minimum to a store that survives the socket. This is not a UI ticket. It touches the transport
layer, and it is the reason this ticket is P1 and not P2.

**Acceptance criteria**
- Kill one client's network for 30 seconds, restore. Game resumes. No desync. Both boards agree.
- Kill it for 65 seconds. Server declares the resignation. Both clients show the result.
- The game row records `result: resignation`, `reason: disconnect`.
- The surviving player cannot move during the grace window. The game is paused, not running.

---

## CM-208 — Login-required routing

**Priority:** P1
**Decision:** fork 1, locked.

**Behaviour**
- `/` is a single common landing page. Signed out: sign-in. Signed in: redirect to `/app`.
- No guest play. `/app/play/bot` sits behind the auth guard with everything else.
- The landing page **loses** the "Play the bot first" secondary CTA. One action on that page.
- Not on the allowlist: the invite-only wall, not a silent 403.

---

## 4. Deltas to CHESS_MVP_UX_SPEC v0.1

| Spec item | Change |
|---|---|
| `CouncilPanel` in the game rail | **Removed.** Council is off in-game |
| The three-consult mechanic | **Rejected.** Do not build it |
| Landing `PrimaryCTA` secondary action | **Removed.** Login required |
| `LeagueTable` | Computed from the games table. **No rating column** anywhere in the schema |
| `GameRail` tabs | This cycle: Moves, Talk. Commentary tab returns in a later cycle |
| New components | `TurnIndicator`, `CheckIndicator`, `RailToggle`, `CommentaryBubble`, `DisconnectBanner` |
| Room state | Now server-authoritative and persisted. Consequence of CM-207 |

---

## 5. QA checklist (run every one, print the result)

- [ ] `boardWidth` prop and container width printed, and equal
- [ ] Drag correct at 390 / 768 / 1440 px
- [ ] Drag correct at 100% and 125% zoom
- [ ] Drag correct after flipping the board
- [ ] **Drag correct immediately after toggling the rail**
- [ ] Exactly one player card active at all times, never zero, never two
- [ ] Pinned piece shows zero legal targets
- [ ] In check, a non-king piece shows only check-resolving moves
- [ ] Click-move and drag-move produce identical move objects
- [ ] Discovered check triggers the check alert
- [ ] Check glow clears when check is resolved
- [ ] Live preview mode refuses to submit a move
- [ ] Both commentary bubbles clear 4.5:1 contrast, ratio printed
- [ ] 30s disconnect resumes with no desync
- [ ] 65s disconnect resigns, server-side, written to the DB
- [ ] `/app/play/bot` redirects to `/` when signed out

---

## 6. Out of scope this cycle

Wardrobe. Voice. Drill generator. Share card. Eval graph. Live commentary *generation* (the
bubble component is in scope, the feed that fills it is not). Promotion picker (still
auto-queening, still a known gap, not this cycle).

---

## 7. Handoff: the three things most likely to break

1. **CM-201 and CM-205 are the same bug wearing two hats.** The rail toggle resizes the board
   container. If `boardWidth` is a constant rather than a measured value, fixing the drag and then
   shipping the toggle re-breaks the drag. Wire the `ResizeObserver` as part of CM-201, not as an
   afterthought in CM-205.
2. **CM-207 is a transport-layer change disguised as a UI ticket.** Server-authoritative,
   persisted room state. If this is built on in-memory state, reconnect will silently desync and
   nobody will notice until a real game is lost to it.
3. **Two move paths.** Click-to-move and drag-to-move must funnel into one handler. Two handlers
   means two validation paths, and one of them will eventually accept something it should not.

**Missing input:** the drag-bug screenshot did not arrive in the last message. CM-201 is specced
from the written description. If the screenshot shows something other than a cursor-offset drag,
re-open the ticket.
