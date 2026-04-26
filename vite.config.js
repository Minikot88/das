import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    // Allow importing CSS files from packages that don't expose them via exports
    conditions: ["module", "browser", "development"],
  },
  server: {
    fs: {
      // Allow serving files from the entire node_modules directory
      allow: [".."],
    },
  },
  optimizeDeps: {
    // Force include react-grid-layout so Vite pre-bundles it
    include: ["react-grid-layout"],
  },
  ssr: {
    noExternal: ["react-grid-layout"],
  },
});
