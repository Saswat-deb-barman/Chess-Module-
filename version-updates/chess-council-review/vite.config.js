import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

// Same reasoning as chess-mvp core's root vite.config.js (deliberately not
// imported from there — this module has to build and deploy on its own):
// Stockfish ships its own .wasm/.js that need to be served as static
// assets, not bundled, since they're loaded inside a Web Worker via
// importScripts(). The single-threaded build avoids needing COOP/COEP
// response headers on whatever static host this ends up on.
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
    // Deliberately different from core chess-mvp's :5173, so both can run
    // side by side locally without a port clash.
    port: 5174,
  },
});
