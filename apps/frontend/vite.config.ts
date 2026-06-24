import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"));

export default defineConfig(({ mode }) => {
  const envDir = resolve(__dirname, "../../");
  // Load environment variables including those without VITE_ prefix
  const env = loadEnv(mode, envDir, "");
  const allowedHosts = env.DEV_ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        disable: process.env.PWA_DISABLE === "true",
        registerType: "autoUpdate",
        injectRegister: "auto",
        devOptions: { enabled: false },
        manifest: {
          name: "SpotiArr",
          short_name: "SpotiArr",
          description: "Self-hosted Spotify downloader with Jellyfin/Plex integration",
          theme_color: "#1DB954",
          background_color: "#000000",
          display: "standalone",
          icons: [
            { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // API and SSE must never be cached or intercepted by the SW
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              // Audio files only — must precede the /api NetworkOnly catch-all (Workbox first-match).
              // maxEntries is fixed at build time (N+1 default: audioPrefetchCount=3 → 4 entries).
              // Serving full 200 bodies (no Range) lets the SW cache offline playback without
              // synthetic-206 slicing. The NetworkOnly rule at index 1 keeps SSE/status/downloads live.
              urlPattern: ({ url }) => url.pathname === "/api/library/audio",
              handler: "CacheFirst",
              options: {
                cacheName: "spotiarr-audio",
                matchOptions: { ignoreVary: true },
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 4, purgeOnQuotaError: true },
              },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api"),
              handler: "NetworkOnly",
            },
          ],
        },
      }),
    ],
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
      allowedHosts,
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
