import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const PORT = 4173;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;
const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm run build && vite preview --host ${HOST} --port ${PORT} --strictPort`,
    cwd: ROOT_DIR,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
});
