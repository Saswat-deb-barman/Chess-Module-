# Login backgrounds

Drop static images or short looping videos here and they show up on the
login screen automatically — no code changes needed. `src/lib/loginBackgrounds.js`
globs this folder at build time (`import.meta.glob`), so a new file is
picked up the next time the dev server hot-reloads or the app is built for
deploy.

## Supported formats

- Images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`
- Video loops: `.mp4`, `.webm` (rendered muted, autoplay, loop — same
  treatment as a GIF, not a video with sound)

## How it's used

`LoginScreen.jsx` picks one background at random per mount, from a pool
that includes both these assets AND the existing live decorative chess
replay (`src/lib/loginReplays.js`) — so dropping files in here adds
variety without replacing the chess board entirely. If this folder is
empty, the login screen falls back to the chess replay 100% of the time,
exactly as it did before this folder existed.

## Naming

Name files descriptively (`felt-texture-closeup.jpg`, `pieces-shadow-loop.mp4`)
— the filename isn't shown anywhere, but it's the only label anyone
editing this folder later has to go on.

## Deploy

Nothing extra to configure — these are bundled by Vite like any other
imported asset (fingerprinted, copied into the production build), so
whatever's here when you push to `main` ships on the next Vercel
auto-deploy.
