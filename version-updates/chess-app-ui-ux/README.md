# chess-app-ui-ux

Front-end UI/UX workspace — new designs and interface experiments for
chess-mvp, built independently from core `src/`.

## Status

The design deliverable requested in `DESIGN_PROMPT.md` has arrived —
`prototype.html` plus its extracted, organized source (below). **This is
reference material, not a running module yet**: nothing here is wired
into core `src/`/`server/`, and this folder has no `package.json`/dev
server of its own (unlike `chess-council-review/`). Next step, when
someone picks this up to actually build it: scaffold a real Vite/React
project here (or skip straight to porting into core — see "Promotion
path" below) using this content as the source of truth.

## What `prototype.html` is

A self-unpacking bundle — open it directly in any browser (no build
step, no server) and it reconstructs a full interactive React app from
an embedded, compressed asset manifest. It's a beginner-friendly ("for
Dummies") restyle of chess-mvp's actual screens: same feature set (bot
difficulty, play-a-friend lobby, live board, Council commentary,
5-persona report, game history), matching component names, just fully
re-skinned — dark cinematic theme, a bottom mobile-nav bar (Back / Hint
/ Reset / Chat / Menu-as-history) instead of the current top-of-page
layout, and small onboarding touches like the "How to move the King" tip
card.

Everything else in this folder was extracted from inside that bundle (it
embeds real React/JSX source, not just rendered images) and reorganized
into readable, individually-diffable files, matching the deliverable
structure `DESIGN_PROMPT.md` asked for.

## Contents

| Path | What |
|---|---|
| `DESIGN_PROMPT.md` | The brief that produced this — read it first for the full intent (mood, references, screen list, quality bar) |
| `prototype.html` | The original interactive mockup (~2.4MB, self-contained) — open directly in a browser to click through it |
| `tokens.css` | Every design token (colors, type scale, spacing, radii, shadows, motion) as plain `:root` CSS |
| `app-shell.jsx` | How the prototype composes screens + the bottom nav — its `App.jsx` equivalent, reference only |
| `components/core/` | `Badge.jsx`, `Button.jsx` |
| `components/game/` | `MoveChip.jsx`, `Piece.jsx`, `TimerRing.jsx` |
| `components/identity/` | `Avatar.jsx` |
| `components/navigation/` | `BottomNav.jsx` |
| `components/surfaces/` | `Card.jsx`, `Modal.jsx` |
| `screens/` | One file per screen, **all with hardcoded/fake demo data** — visual mockups, not functional components |
| `assets/icons/` | The 5 nav icons — actual Lucide icons (`message-circle`, `menu`, `arrow-left`, `circle-question-mark`, `undo-2`); use the `lucide-react` package rather than these specific SVGs if adopting this design |
| `assets/pieces/w-king.png` | The one piece image actually shipped — see gap below |

## Design tokens at a glance

- **Fonts**: Cinzel (serif display, "CHESS" wordmark) + Manrope (sans, UI
  text) + Roboto Mono (clocks/notation) — free Google Fonts, wired via
  `@import` at the top of `tokens.css`.
- **Palette**: near-black slate background (`--bg-base: #2e3138`) with a
  cool-slate-to-warm-bronze gradient, one accent blue
  (`--accent-blue: #4fa8ff`) for every interactive/selected state, and a
  separate move-quality palette (`--quality-blunder` red through
  `--quality-excellent` green) reserved for post-game analysis — maps
  directly onto the Council Report's existing classification badges.
- **Surfaces**: "glass" (translucent fill + blur + hairline border) is an
  accent over solid opaque surfaces (bottom nav, inputs), not applied
  everywhere — matches the brief's explicit instruction.
- Spacing/radius/shadow/motion scales are all in `tokens.css`, using the
  same variable names throughout every component file.

## Gaps against the original brief

1. **Piece renders — the brief's core ask was not met.** `DESIGN_PROMPT.md`
   asked for a photoreal 3D chrome/glass 12-piece set, with an explicit
   instruction to flag back if that wasn't achievable rather than
   silently substitute. What actually shipped: **one** image
   (`assets/pieces/w-king.png`), and every other piece in the mockup's
   demo board falls back to a plain Unicode glyph (♞ ♗ etc.) — the flat/
   vector fallback the brief only wanted for small in-board squares, not
   as the de facto piece set. `Piece.jsx`'s own code comment references a
   `PIECES.md` sourcing note that was never actually included in the
   deliverable. Needs a real answer (source a licensed 3D set, or use
   Saswat's offered Blender model, or consciously accept the flat-icon
   fallback as final) before this looks like the brief's reference images.
2. **The bottom-nav IA is a real UX decision, not just a visual swap.**
   Where does "Resign" live in that nav? Where does the *live* Council
   ping panel go during a game (separate from the post-game report)? The
   brief asked for this nav and got it, but adopting it into the real app
   means deciding these placements first.
3. No promotion-ready CSS files per component (`.css` alongside each
   `.jsx`) — the brief asked for `.jsx` + `.css` pairs; what shipped uses
   inline `style={{...}}` objects referencing the CSS custom properties
   instead. Functionally equivalent, just a different authoring pattern —
   worth normalizing to the existing `App.css` convention during
   promotion rather than introducing inline-style-per-component as a new
   pattern.

## Promotion notes — mapping to core `src/`

| This module | Core `src/` equivalent |
|---|---|
| `screens/BoardScreen.jsx` | `components/Board.jsx` |
| `screens/MultiplayerBoardScreen.jsx` | `components/MultiplayerBoard.jsx` |
| `screens/FriendLobbyScreen.jsx` | `components/FriendLobby.jsx` |
| `screens/CouncilReportScreen.jsx` | `components/CouncilReport.jsx` |
| `screens/GameHistoryScreen.jsx` | `components/GameHistory.jsx` |
| `screens/DifficultySelector.jsx` | `components/DifficultySelector.jsx` |
| `screens/SignInButton.jsx` | `components/SignInButton.jsx` |
| `tokens.css` | Would extend/replace the token portion of `App.css` |
| `app-shell.jsx`'s bottom nav | *(new — current app has no bottom nav; needs the IA decision above first)* |

Same names, same responsibilities, one-to-one — this was clearly designed
as a skin for chess-mvp's exact existing feature set, not a different
product. When this actually gets promoted: re-skin the *real* components
in core `src/` to use `tokens.css`'s variables one at a time, keeping
their real props/state/behavior intact — the files in `screens/` here are
static mockups with fake data (hardcoded move lists, a fake signed-in
user, a hardcoded room code), not drop-in replacements. Promoting into
core is a deliberate, separate decision per this repo's root `CLAUDE.md`
— not automatic just because this reference material exists now.
