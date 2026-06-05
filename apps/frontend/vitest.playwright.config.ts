import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/runtime/**/*.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
