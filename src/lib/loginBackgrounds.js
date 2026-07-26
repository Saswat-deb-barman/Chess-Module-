// Globs src/assets/login-backgrounds/ at build time — dropping a new
// file there is enough to make it available here, no import/manifest edit
// needed. `eager: true` + `import: "default"` resolves straight to the
// built asset URL (fingerprinted in production), matching how any other
// Vite-imported image/video would resolve.
const images = import.meta.glob("../assets/login-backgrounds/*.{jpg,jpeg,png,webp,gif}", {
  eager: true,
  import: "default",
});
const videos = import.meta.glob("../assets/login-backgrounds/*.{mp4,webm}", {
  eager: true,
  import: "default",
});

/** `{ type: "image" | "video", url }` for every file currently in the folder. */
export function listLoginBackgrounds() {
  return [
    ...Object.values(images).map((url) => ({ type: "image", url })),
    ...Object.values(videos).map((url) => ({ type: "video", url })),
  ];
}

/**
 * One random background asset, or null if the folder is empty — the
 * caller's job to fall back to something else (LoginScreen falls back to
 * the live decorative chess replay, exactly its pre-existing behavior).
 */
export function pickLoginBackground() {
  const all = listLoginBackgrounds();
  if (all.length === 0) return null;
  return all[Math.floor(Math.random() * all.length)];
}
