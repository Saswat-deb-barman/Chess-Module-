# chess-3d-engine (standalone)

A 3D chess board/piece renderer built with Three.js — an orthographic
camera, GLTF-loaded piece models, generated with help from Gemini.
Fully standalone, per the `version-updates/` convention: doesn't import
from or modify chess-mvp core's `src/`/`server/`, and core doesn't import
from here. Nothing gets wired into the live game until this is a
deliberate, separate promotion decision.

## Status: scaffold only

This is plumbing, not the real thing yet. `npm install && npm run dev`
right now shows a bare Three.js scene — an orthographic camera looking at
a spinning placeholder cube — just to prove the render loop, camera, and
dev server all work before the real pieces land.

**Waiting on, from Saswat:**
1. The Three.js scene-setup file → replaces `src/scene.js`.
2. The orthographic camera file → replaces `src/camera.js`.
3. The model-loading file (GLTF/GLB pieces into the scene) → likely a new
   `src/models.js`, wired into `src/main.js` alongside the other two.
4. A `.md` spec from Gemini describing the intended piece-generation
   approach — drop it in this folder (e.g. `GEMINI_SPEC.md`) as the
   reference doc for whoever (human or Claude) picks this back up.

Once those land, `src/main.js` gets rewired to call into them instead of
the placeholder cube, and actual `.glb` piece models go in
`public/models/` (see that folder's own README).

## Running it

```bash
cd version-updates/chess-3d-engine
npm install
npm run dev
```

Own dev server, own port (5174, set in `vite.config.js` — chess-mvp core's
dev server is 5173, kept separate so both can run at once). Own
`package.json`, own build (`npm run build`) and deploy target, independent
of chess-mvp's own Vercel/Render deploy.

## Why vanilla Three.js, not React Three Fiber

The described files (a scene file, a camera file, a model-loader file) are
plain Three.js module shapes, not React components — so this scaffold
stays framework-free to match. If the fed-in code turns out to actually be
`@react-three/fiber` (JSX-based) instead, that's a small pivot: add
`@vitejs/plugin-react` + `react`/`react-dom`/`@react-three/fiber` and
restructure `src/main.js` as a React entry point — not a rewrite of
anything else here.
