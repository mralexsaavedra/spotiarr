import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { RangeRequestsPlugin } from "workbox-range-requests";

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
              // Must precede the /api NetworkOnly catch-all below (Workbox is first-match).
              urlPattern: ({ url }) => url.pathname === "/api/library/audio",
              handler: "CacheFirst",
              options: {
                cacheName: "spotiarr-audio",
                // maxEntries = audioPrefetchCount clamp max (10) + 1 to avoid premature eviction
                cacheableResponse: { statuses: [200] },
                expiration: { maxEntries: 11, purgeOnQuotaError: true },
                plugins: [new RangeRequestsPlugin()],
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
