import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@spotiarr/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
    fs: {
      allow: [
        // Monorepo shared code one level up
        resolve(__dirname, ".."),
        // Project root (where top-level node_modules/.pnpm lives)
        resolve(__dirname, "..", ".."),
      ],
    },
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
  },
});
