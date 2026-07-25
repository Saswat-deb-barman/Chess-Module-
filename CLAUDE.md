# Chess by Alchemist (chess-mvp repo) — working conventions

Read `HANDOFF.md` for full project history and current status. This file
is the short, load-bearing convention every session (human or Claude)
should follow before touching anything.

## Core vs. version-updates

- `src/`, `server/`, `index.html`, `vite.config.js`, `public/` at the
  repo root are the **live, working app** — the bot game, friend
  multiplayer, auth, and the original lightweight council (live pings +
  one-line recap). Don't edit these directly for new feature work.
- `version-updates/` is where all new features and experiments get
  built — each as its own self-contained, independently runnable and
  independently deployable subfolder (own `package.json`, own dev
  server, own README). Nothing in `version-updates/` imports from or
  modifies core `src/`/`server/`, and nothing in core imports from
  `version-updates/`. That separation is the whole point: experiments
  can be built, run, and even deployed without any risk to the live game.
- A `version-updates/<name>` module only gets merged into core once
  Saswat explicitly decides to promote it — that's a deliberate, separate
  step, never automatic just because a module "works."

See `version-updates/README.md` for the full convention and the current
module list.
