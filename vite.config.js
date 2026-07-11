import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Stockfish ships its own .wasm/.js files that need to be served as static
// assets rather than bundled, since they're loaded inside a Web Worker via
// importScripts(). This copies them into /public at build/dev time so
// src/engine/stockfishWorker.js can load them by URL.
//
// Using the "-single" (single-threaded) build deliberately: the
// multi-threaded NNUE build needs Cross-Origin-Opener-Policy /
// Cross-Origin-Embedder-Policy response headers to use SharedArrayBuffer,
// which is one more thing to configure on whatever host we deploy to.
// Single-threaded is slightly slower but works with zero server config,
// which matches the "light, not clunky" goal for this MVP.
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/stockfish/src/stockfish-nnue-16-single.{js,wasm}",
          dest: "engine",
        },
      ],
    }),
  ],
  server: {
    port: 5173,
  },
});
