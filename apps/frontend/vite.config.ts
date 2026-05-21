import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"));

export default defineConfig(({ mode }) => {
  const envDir = resolve(__dirname, "../../");
  // Load environment variables including those without VITE_ prefix
  const env = loadEnv(mode, envDir, "");

  return {
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    resolve: {
      alias: {
        "@spotiarr/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
        "@": resolve(__dirname, "./src"),
      },
    },
    envDir,
    server: {
      host: env.PUBLIC_HOST || "localhost",
      proxy: {
        "/api": {
          target: `http://${env.PUBLIC_HOST || "localhost"}:3000`,
          changeOrigin: true,
        },
      },
      fs: {
        allow: [resolve(__dirname, ".."), resolve(__dirname, "..", "..")],
      },
    },
    build: {
      outDir: "./dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "query-vendor": ["@tanstack/react-query"],
            "fontawesome-vendor": [
              "@fortawesome/fontawesome-svg-core",
              "@fortawesome/react-fontawesome",
              "@fortawesome/free-solid-svg-icons",
              "@fortawesome/free-regular-svg-icons",
              "@fortawesome/free-brands-svg-icons",
            ],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: "esbuild",
      target: "esnext",
    },
  };
});
