import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HOST = "127.0.0.1";
const PORT = 3000;
const ROOT_DIR = fileURLToPath(new URL("../../../../", import.meta.url));
const BACKEND_DIR = path.join(ROOT_DIR, "apps/backend");

const SEEDED_SETTINGS = [
  { key: "UI_LANGUAGE", value: "en" },
  { key: "FORMAT", value: "m4a" },
  { key: "spotify_user_access_token", value: "e2e-access-token" },
  { key: "spotify_user_refresh_token", value: "e2e-refresh-token" },
] as const;

interface RealStackContext {
  tempDir: string;
  downloadsDir: string;
  databasePath: string;
  databaseUrl: string;
}

function createContext(): RealStackContext {
  const tempDir = mkdtempSync(path.join(tmpdir(), "spotiarr-e2e-real-"));
  const downloadsDir = path.join(tempDir, "downloads");
  const databasePath = path.join(tempDir, "real-stack.db");

  mkdirSync(downloadsDir, { recursive: true });

  return {
    tempDir,
    downloadsDir,
    databasePath,
    databaseUrl: `file:${databasePath}`,
  };
}

function applyEnvironment(context: RealStackContext): void {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = context.databaseUrl;
  process.env.DOWNLOADS = context.downloadsDir;
  process.env.REDIS_HOST = HOST;
  process.env.REDIS_PORT = "6379";
  process.env.SPOTIFY_CLIENT_ID = "e2e-client-id";
  process.env.SPOTIFY_CLIENT_SECRET = "e2e-client-secret";
  process.env.SPOTIFY_REDIRECT_URI = `http://${HOST}:${PORT}/api/auth/spotify/callback`;
  process.env.PLAYWRIGHT_REAL_BASE_URL = `http://${HOST}:${PORT}`;
}

function runBackendMigrations(): void {
  execFileSync("pnpm", ["--filter", "backend", "run", "prisma:migrate:deploy"], {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: "inherit",
  });
}

async function seedDatabase(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    await prisma.setting.deleteMany();

    await prisma.setting.createMany({
      data: SEEDED_SETTINGS.map((setting) => ({
        key: setting.key,
        value: setting.value,
        updatedAt: BigInt(0),
      })),
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function startServer(): Promise<{
  server: http.Server;
  disconnectPrisma: () => Promise<void>;
}> {
  const { validateEnvironment } = await import(
    pathToFileURL(path.join(BACKEND_DIR, "dist/infrastructure/setup/environment.js")).href
  );

  validateEnvironment();

  const { app } = await import(pathToFileURL(path.join(BACKEND_DIR, "dist/app.js")).href);
  const { prisma } = await import(
    pathToFileURL(path.join(BACKEND_DIR, "dist/infrastructure/setup/prisma.js")).href
  );

  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, HOST, () => resolve());
  });

  return {
    server,
    disconnectPrisma: () => prisma.$disconnect(),
  };
}

async function main(): Promise<void> {
  const context = createContext();
  applyEnvironment(context);
  runBackendMigrations();
  await seedDatabase(context.databaseUrl);

  const { server, disconnectPrisma } = await startServer();

  const shutdown = async (exitCode = 0): Promise<void> => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectPrisma();
    rmSync(context.tempDir, { recursive: true, force: true });
    process.exit(exitCode);
  };

  process.on("SIGINT", () => {
    void shutdown(0);
  });

  process.on("SIGTERM", () => {
    void shutdown(0);
  });

  console.log(`[playwright-real-stack] ready at http://${HOST}:${PORT}`);
}

void main().catch((error: unknown) => {
  console.error("[playwright-real-stack] failed to start", error);
  process.exit(1);
});
