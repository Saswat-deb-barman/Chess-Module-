# version-updates

Staging ground for new chess-mvp features. Each subfolder here is a
self-contained module: its own `package.json`, its own dev server, its
own deploy target. None of them touch core `src/` or `server/` at the
repo root, and core doesn't import anything from here either — that
separation is the whole point, so experiments can be built and even
deployed without any risk to the live game.

## Convention

- One subfolder per feature, named for what it does
  (`kebab-case-like-this`).
- Each subfolder is runnable on its own — `cd version-updates/<name>` and
  follow that module's own README.
- Each subfolder deploys as its own project (Vercel/Render/whatever fits),
  independent from chess-mvp's own deploy.
- Promoting a module into core `src/`/`server/` is a deliberate, separate
  decision — never automatic just because something "works" here.

## Modules

- **chess-council-review/** — standalone paste-a-PGN tool: engine-flagged
  defining moves + the 5-persona council report (The Historian, Tactics
  Tara, Strategist Sam, Endgame Ed, Coach Priya). Not wired to any
  specific game source — you paste in any PGN, chess-mvp or otherwise.
- **chess-app-ui-ux/** — front-end UI/UX workspace for new designs and
  interface experiments. A design deliverable (dark cinematic restyle,
  "Chess for Dummies") has landed as reference material — extracted
  React source + design tokens + an interactive prototype — but nothing
  is wired up yet; still no `package.json`/dev server of its own.
