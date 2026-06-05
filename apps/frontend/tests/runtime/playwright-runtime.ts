import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BASE_URL = "http://127.0.0.1:4173";
const PLAYWRIGHT_TIMEOUT_MS = 120_000;

export interface PlaywrightRuntimeResult {
  exitCode: number | null;
  markerExists: boolean;
  output: string;
}

export async function runStartupFailureScenario(): Promise<PlaywrightRuntimeResult> {
  return runFixture({
    webServerCommand: `node -e "process.exit(1)"`,
    specBody: `
      import { test } from "@playwright/test";
      import { writeFileSync } from "node:fs";

      test("startup failure fixture executed", async () => {
        writeFileSync(process.env.PLAYWRIGHT_SPEC_MARKER!, "executed");
      });
    `,
  });
}

interface FixtureOptions {
  specBody: string;
  webServerCommand: string;
}

async function runFixture({
  specBody,
  webServerCommand,
}: FixtureOptions): Promise<PlaywrightRuntimeResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "spotiarr-playwright-runtime-"));
  const configPath = join(tempDir, "playwright.config.ts");
  const specPath = join(tempDir, "fixture.spec.ts");
  const markerPath = join(tempDir, "spec-executed.txt");

  await writeFile(configPath, buildConfig(webServerCommand), "utf8");
  await writeFile(specPath, specBody.trimStart(), "utf8");

  try {
    const { exitCode, stderr, stdout } = await runPlaywright(configPath, specPath, markerPath);

    return {
      exitCode,
      markerExists: await fileExists(markerPath),
      output: `${stdout}\n${stderr}`.trim(),
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function buildConfig(webServerCommand: string): string {
  return `
    import { defineConfig, devices } from "@playwright/test";

    export default defineConfig({
      testDir: ${JSON.stringify(".")},
      testMatch: "**/*.spec.ts",
      fullyParallel: false,
      retries: 0,
      reporter: [["line"]],
      use: {
        baseURL: ${JSON.stringify(BASE_URL)},
        trace: "off",
        screenshot: "off",
      },
      projects: [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ],
      webServer: {
        command: ${JSON.stringify(webServerCommand)},
        cwd: ${JSON.stringify(FRONTEND_ROOT)},
        url: ${JSON.stringify(BASE_URL)},
        reuseExistingServer: false,
        stdout: "pipe",
        stderr: "pipe",
        timeout: ${PLAYWRIGHT_TIMEOUT_MS},
      },
    });
  `.trimStart();
}

async function runPlaywright(
  configPath: string,
  specPath: string,
  markerPath: string,
): Promise<{ exitCode: number | null; stderr: string; stdout: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("pnpm", ["exec", "playwright", "test", "--config", configPath, specPath], {
      cwd: FRONTEND_ROOT,
      env: {
        ...process.env,
        PLAYWRIGHT_SPEC_MARKER: markerPath,
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      resolvePromise({ exitCode, stderr, stdout });
    });
  });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}
