# Piece models

Drop GLTF/GLB chess piece models here once they exist (`.glb` preferred —
single binary file, easiest to load). The model-loading file you're
feeding in will reference paths under this folder (served at `/models/...`
by Vite in dev, copied as-is into `dist/models/...` on build — no config
needed, same convention as chess-mvp core's `public/`).
