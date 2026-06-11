import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/infrastructure/setup/**"],
      // Thresholds sit just under the currently measured coverage so the gate is
      // green on merge. Ratchet these up as coverage improves (issue #149).
      thresholds: {
        lines: 52,
        statements: 52,
        functions: 53,
        branches: 72,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
