import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/index.{ts,tsx}", "src/index.tsx", "src/i18n.ts"],
      // Thresholds sit just under the currently measured coverage so the gate is
      // green on merge. Ratchet these up as coverage improves (issue #149).
      thresholds: {
        lines: 92,
        statements: 92,
        functions: 90,
        branches: 84,
      },
    },
  },
  resolve: {
    alias: {
      "@spotiarr/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
