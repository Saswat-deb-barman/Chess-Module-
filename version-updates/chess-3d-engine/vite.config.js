import { defineConfig } from "vite";

// No plugins yet — plain Three.js, not React. If the fed-in files turn
// out to need JSX (e.g. @react-three/fiber instead of vanilla three.js),
// add @vitejs/plugin-react + the react/react-dom/@react-three/fiber deps
// at that point rather than guessing now.
export default defineConfig({
  server: {
    port: 5174,
  },
});
