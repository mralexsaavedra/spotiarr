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
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts",
        "src/infrastructure/setup/**",
        // Non-logic: interfaces, type declarations, DI/bootstrap wiring and test harness.
        // These carry no unit-testable branches; excluding keeps the gate measuring real logic.
        "src/**/*.port.ts",
        "src/**/*.types.ts",
        "src/**/types.ts",
        "src/app.ts",
        "src/container.ts",
        "src/testing/**",
        // Domain contracts: pure interface declarations (repositories, queue/event
        // service ports). No executable code, so they cannot carry coverage and only
        // drag the measured number down. Implementations live in infrastructure.
        "src/domain/repositories/**",
        "src/domain/services/**",
        "src/domain/events/**",
        // Route files are pure Express wiring (router.<verb>(path, controller)); the logic
        // they delegate to lives in controllers and middleware, which are unit-tested.
        "src/presentation/routes/**/*.routes.ts",
      ],
      // Thresholds sit just under the currently measured coverage so the gate is
      // green on merge. Ratchet these up as coverage improves (issue #204).
      thresholds: {
        lines: 91,
        statements: 91,
        functions: 92,
        branches: 86,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
