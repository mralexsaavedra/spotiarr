import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const PREVIEW_PORT = 4173;
const PREVIEW_HOST = "127.0.0.1";
const PREVIEW_BASE_URL = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
const REAL_PORT = process.env.PLAYWRIGHT_REAL_PORT ?? "3000";
const REAL_BASE_URL = process.env.PLAYWRIGHT_REAL_BASE_URL ?? `http://127.0.0.1:${REAL_PORT}`;
const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));
const PLAYWRIGHT_TARGET = process.env.PLAYWRIGHT_TARGET;

const webServers = [];

if (PLAYWRIGHT_TARGET !== "real") {
  webServers.push({
    command: `PWA_DISABLE=true pnpm run build && vite preview --host ${PREVIEW_HOST} --port ${PREVIEW_PORT} --strictPort`,
    cwd: ROOT_DIR,
    url: PREVIEW_BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
    timeout: 120_000,
  });
}

if (PLAYWRIGHT_TARGET !== "mocked") {
  webServers.push({
    command:
      "pnpm --filter @spotiarr/shared run build && PWA_DISABLE=true pnpm --filter frontend run build && pnpm --filter backend run build && tsx tests/helpers/real-stack.ts",
    cwd: ROOT_DIR,
    url: REAL_BASE_URL,
    reuseExistingServer: false,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
    timeout: 120_000,
  });
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Give visibility/state assertions headroom over the cold-CI render chain
  // (route fulfil -> store update -> React re-render) instead of racing the 5s default.
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mocked",
      testMatch: "**/mocked/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: PREVIEW_BASE_URL,
      },
    },
    {
      name: "real",
      testMatch: "**/real/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: REAL_BASE_URL,
      },
    },
  ],
  webServer: webServers,
});
