# Prompt for Claude Design — chess-mvp Design System

Paste everything below the line into Claude Design as a single prompt.
This is scoped to restyle chess-mvp's **existing** screens only (no new
game modes) so the output can be dropped into
`version-updates/chess-app-ui-ux/` immediately and promoted into core
later with minimal rework.

---

## Context

I'm building a design system for **chess-mvp**, a live React chess web
app (play Stockfish solo, or play a friend in real time, both with live
LLM commentary and a 5-persona post-game analysis called "the Council").
The current UI is functional but visually generic — plain CSS, no
consistent design language. I want a premium, moody, tactile visual
system inspired by the reference screenshots below, applied consistently
across every screen the app already has. Do not invent new features or
screens — this is a restyle, not a redesign of the product.

**Stack constraints (must match, so this drops into the existing repo
without a rewrite):**
- React 18 + Vite, functional components + hooks
- Plain CSS with CSS custom properties for design tokens (no Tailwind,
  no CSS-in-JS library, no component framework like MUI/Chakra) —
  matches the existing `App.css` convention
- Board rendering via `react-chessboard` + `chess.js` (don't replace
  these libraries — reskin them via their theming props / CSS overrides)
- Must work as a **standalone, independently runnable module** with its
  own `package.json`, `vite.config.js`, and dev server — this lives in
  `version-updates/chess-app-ui-ux/` and does not import from or modify
  chess-mvp's core `src/`
- Mobile-first responsive (this is played heavily on phones), but must
  also hold up at desktop width

## Visual reference

[Two reference screenshots attached: a piece-teaching card ("How to Move
the King") and a live two-player game screen.] Target this look and
feel exactly:

- **Mood**: dark, cinematic, moody gradients (cool blue-grey blending
  into warm bronze/amber) rather than flat black. Backgrounds should
  feel like soft studio lighting on glass, not a solid dark hex.
- **Glassmorphism as an accent, not the whole UI**: frosted, semi
  translucent cards/panels with soft blur and a subtle 1px light border,
  layered over the gradient background — used for piece-info cards, the
  move-history strip, and modals. Don't apply glass to every surface;
  reserve it for panels that float over the board/background.
- **Chess pieces are the hero visual**: premium, photoreal 3D-rendered
  chrome/glass/marble pieces (not flat vector icons) — soft specular
  highlights, subtle drop shadow, presented large and centered on
  teaching/empty states. Match this as closely as achievable in a coded
  React app:
  - Source or generate a matching **3D-rendered piece set** (12 pieces:
    white/black × 6 types) as PNG/WebP assets with transparent
    backgrounds, styled like the reference (brushed chrome white,
    dark smoked-glass black). Flag this as an asset-generation step —
    call out clearly if you need me to supply or approve piece renders
    rather than silently substituting flat icons.
  - Check first for a free/licensed 3D chess piece render set (or a
    Blender/glTF model permissively licensed for commercial use) that
    matches the brushed-chrome/smoked-glass look closely enough to
    re-render or re-light. Only if nothing suitable turns up: I have a
    Blender source model I can hand over to render the full 12-piece set
    from (correct materials, camera angle, lighting) — ask for it
    explicitly rather than settling for a mismatched free asset.
  - Fall back to a clean flat/vector piece set only for small in-board
    squares where a 3D render would be too busy at that size, so the
    board stays readable during play; keep the photoreal set for hero
    moments (empty states, captured-piece trays, teaching callouts,
    result screens).
- **Typography**: a refined serif/display face for hero moments (piece
  names, headlines — like "KING" in the reference) paired with a clean
  geometric sans for UI chrome, labels, body text, and numbers/notation.
  Pick real, freely-licensed web fonts that approximate this pairing
  (e.g. a Google Fonts serif + sans combination) and define them as
  design tokens.
- **Color-coded move feedback**: dashed light-blue trajectory lines with
  dot waypoints for legal-move hints, a solid blue square outline for
  the selected piece/square — carry this exact blue as the system's
  single accent color against the neutral dark palette. Reserve
  green/amber/red only for post-game move-quality feedback (blunder /
  inaccuracy / excellent), not for general UI.
- **Cards & chips**: rounded-corner (16–24px radius) cards for piece
  info and move history; small pill-shaped chips for individual moves
  in algebraic notation (e.g. `Nxc5`); circular avatar photos with a
  colored ring for turn/state; circular ring-style countdown timers
  (filled arc, not a digital-only readout) alongside/instead of plain
  digit clocks.
- **Bottom icon nav bar**: a persistent bottom bar with 4–5 icon-only
  buttons (back, help/hint, undo/reset, chat with unread badge, menu) —
  the active one gets a solid blue filled circle background.
- **Iconography**: thin-stroke, minimal line icons throughout (not
  filled/glyph-heavy), consistent stroke width.

## Screens to design (map 1:1 to existing chess-mvp components — do not
add screens beyond this list)

For each, produce both the visual design and the React component(s),
matching the existing component name so it's a drop-in replacement later:

1. **Setup / difficulty select** (`DifficultySelector.jsx`) — easy/
   medium/hard picker before a solo game starts.
2. **Solo board / gameplay** (`Board.jsx` + `Clock.jsx` +
   `MoveHistory.jsx` + `CouncilPanel.jsx`) — the core play screen: board,
   both clocks, move history strip, live council commentary pings,
   resign action.
3. **Friend lobby** (`FriendLobby.jsx`) — create-room / join-room via
   code, waiting-for-opponent state.
4. **Multiplayer board** (`MultiplayerBoard.jsx`) — same as #2 but for
   two human players, with both players' avatars/names/ranks visible
   (this is the closest match to the reference's two-player screen —
   use its avatar + timer-ring + name/rank layout directly).
5. **Post-game / Council Report** (`CouncilReport.jsx`) — the 5-persona
   report (Historian, Tactics Tara, Strategist Sam, Endgame Ed, Coach
   Priya) plus the defining-moves timeline with color-coded move
   quality.
6. **Game history / past games** (`GameHistory.jsx`) — expandable list
   of past games with per-game chat.
7. **Sign-in** (`SignInButton.jsx`) — minimal Google sign-in entry
   point, must degrade gracefully to a "guest" affordance since sign-in
   is optional in the real app.
8. **Shared chrome** — the bottom icon nav bar and any modal/toast
   pattern, used consistently across 2–6 above.

Do not design: onboarding/lesson flows, puzzles, tournaments, or
leaderboards — chess-mvp doesn't have these features yet. (The reference
teaching-card screen is style inspiration for typography/hero-piece
treatment only — reuse its visual language on the screens above, e.g.
the difficulty selector or an empty pre-game state, rather than building
a literal lesson screen.)

## Design system deliverables

1. **Design tokens** as CSS custom properties (`:root` in a
   `tokens.css`): color palette (background gradient stops, glass
   surface color + blur + border, the single blue accent, move-quality
   greens/ambers/reds, text primary/secondary/muted), spacing scale,
   radius scale, shadow/elevation levels, font families + a type scale,
   motion durations/easings.
2. **Base components**, each as its own `.jsx` + `.css`: Button (primary/
   secondary/icon-only variants), Card (glass variant + solid variant),
   Avatar (with status ring), TimerRing, MoveChip, BottomNav, Modal,
   Badge/pill.
3. **Screen components** listed above, composed from the base
   components.
4. A `README.md` for this module (following the existing
   `version-updates/chess-council-review/README.md` pattern) covering:
   what it is, how to run it standalone, and — critically — a short
   **"promotion notes"** section listing exactly which files map to
   which core `src/` files, so moving this into core later is a
   near-mechanical swap.
5. A `PIECES.md` (or note in the README) documenting where the 3D piece
   renders came from / how to regenerate or replace them, since these
   are the one asset type that can't be produced as pure code.

## Baseline quality bar (use your judgment beyond this — no other hard
constraints)

- Reasonable color contrast for body text and interactive elements even
  within the moody dark palette (don't sacrifice legibility for mood)
- Touch targets sized for real mobile play (nav icons, move chips,
  board squares)
- Dark theme only for v1 — don't build out a separate light theme unless
  it falls out naturally from the token structure
- Keep bundle size sane: no heavy UI framework, prefer CSS over JS for
  visual effects (blur, gradients, animations) where possible

## What to flag back to me rather than guess

- If a true photoreal 3D piece render set isn't achievable without an
  image-generation or asset-sourcing step, say so explicitly and propose
  the closest achievable alternative rather than quietly shipping flat
  icons.
- Any place the existing `react-chessboard` library's theming API can't
  achieve the reference look (e.g. per-square gradient, dashed move
  trajectories) — note where it needs a custom overlay instead of
  fighting the library.

---
