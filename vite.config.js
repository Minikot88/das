import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
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
        allow: [__dirname],
      },
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    optimizeDeps: {
      include: ["react-grid-layout"],
    },
    ssr: {
      noExternal: ["react-grid-layout"],
    },
  };
});
