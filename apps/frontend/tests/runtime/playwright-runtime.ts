import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
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
    reuseExistingServer: false,
    specBody: `
      import { test } from "@playwright/test";
      import { writeFileSync } from "node:fs";

      test("startup failure fixture executed", async () => {
        writeFileSync(process.env.PLAYWRIGHT_SPEC_MARKER!, "executed");
      });
    `,
  });
}

export async function runPortCollisionScenario(
  reuseExistingServer: boolean,
): Promise<PlaywrightRuntimeResult> {
  const existingServer = await startExistingServer();

  try {
    return await runFixture({
      webServerCommand: `node -e "require('node:http').createServer((_, response) => response.end('playwright')).listen(4173, '127.0.0.1')"`,
      reuseExistingServer,
      specBody: `
        import { test } from "@playwright/test";
        import { writeFileSync } from "node:fs";

        test("port collision fixture executed", async () => {
          writeFileSync(process.env.PLAYWRIGHT_SPEC_MARKER!, "executed");
        });
      `,
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      existingServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

interface FixtureOptions {
  specBody: string;
  webServerCommand: string;
  reuseExistingServer: boolean;
}

async function runFixture({
  reuseExistingServer,
  specBody,
  webServerCommand,
}: FixtureOptions): Promise<PlaywrightRuntimeResult> {
  const tempDir = await mkdtemp(join(tmpdir(), "spotiarr-playwright-runtime-"));
  const configPath = join(tempDir, "playwright.config.ts");
  const specPath = join(tempDir, "fixture.spec.ts");
  const markerPath = join(tempDir, "spec-executed.txt");

  await writeFile(configPath, buildConfig(webServerCommand, reuseExistingServer), "utf8");
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

function buildConfig(webServerCommand: string, reuseExistingServer: boolean): string {
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
        reuseExistingServer: ${JSON.stringify(reuseExistingServer)},
        stdout: "pipe",
        stderr: "pipe",
        timeout: ${PLAYWRIGHT_TIMEOUT_MS},
      },
    });
  `.trimStart();
}

async function startExistingServer(): Promise<http.Server> {
  const server = http.createServer((_, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("existing-server");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(4173, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
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
