import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const productionDeployment = (env.APP_ENV || process.env.APP_ENV) === "production";
  const mockMode = env.VITE_USE_MOCK || process.env.VITE_USE_MOCK;
  const sessionRequiredUrl = env.VITE_EXTERNAL_SESSION_REQUIRED_URL || process.env.VITE_EXTERNAL_SESSION_REQUIRED_URL;
  if (productionDeployment && mockMode !== "false") {
    throw new Error("VITE_USE_MOCK must be explicitly set to false for production builds");
  }
  if (productionDeployment) {
    let parsedSessionUrl;
    try {
      parsedSessionUrl = new URL(sessionRequiredUrl);
    } catch {
      throw new Error("VITE_EXTERNAL_SESSION_REQUIRED_URL must be a valid HTTPS URL for production builds");
    }
    if (parsedSessionUrl.protocol !== "https:" || /placeholder|change[-_]?me|<|>/i.test(sessionRequiredUrl)) {
      throw new Error("VITE_EXTERNAL_SESSION_REQUIRED_URL must be a non-placeholder HTTPS URL for production builds");
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@app": path.resolve(__dirname, "src/app"),
        "@modules": path.resolve(__dirname, "src/modules"),
        "@domain": path.resolve(__dirname, "src/domain"),
        "@shared": path.resolve(__dirname, "src/shared"),
        "@infrastructure": path.resolve(__dirname, "src/infrastructure"),
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
    test: {
      environment: "jsdom",
      setupFiles: "./src/shared/test/setup.js",
      globals: true,
      css: true,
      exclude: ["apps/api/**", "tests/e2e/**", "node_modules/**", "dist/**"],
    },
  };
});
