import * as http from "node:http";
import { createApp } from "../app";
import { initializeContainer } from "../container";
import { configureSpotifyRateLimiters } from "../infrastructure/external/spotify-http.client";
import { getEnv, validateEnvironment } from "../infrastructure/setup/environment";
import { prisma } from "../infrastructure/setup/prisma";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const SHUTDOWN_TIMEOUT_MS = 5_000;

interface PlaywrightRealStackServerOptions {
  host?: string;
  port?: number;
}

function getHost(options: PlaywrightRealStackServerOptions): string {
  return options.host ?? DEFAULT_HOST;
}

function getPort(options: PlaywrightRealStackServerOptions): number {
  const port = options.port ?? DEFAULT_PORT;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid Playwright real-stack port: ${String(port)}`);
  }

  return port;
}

export async function startPlaywrightRealStackServer(
  options: PlaywrightRealStackServerOptions = {},
): Promise<{
  server: http.Server;
  shutdown: () => Promise<void>;
}> {
  validateEnvironment();
  const env = getEnv();
  configureSpotifyRateLimiters(env);

  const container = initializeContainer(env);
  const app = createApp(container);
  const server = http.createServer(app);
  const host = getHost(options);
  const port = getPort(options);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  console.log(`[playwright-real-stack] ready at http://${host}:${port}`);

  return {
    server,
    shutdown: () => closeServer(server),
  };
}

async function closeServer(server: http.Server): Promise<void> {
  const closeServer = new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => (error ? reject(error) : resolve()));
  });

  const forceClose = new Promise<void>((resolve) => {
    setTimeout(() => {
      server.closeAllConnections();
      resolve();
    }, SHUTDOWN_TIMEOUT_MS).unref();
  });

  await Promise.race([closeServer, forceClose]);

  await prisma.$disconnect();
}

async function shutdown(server: http.Server, exitCode: number): Promise<void> {
  await closeServer(server);
  process.exit(exitCode);
}

async function main(): Promise<void> {
  const host = process.argv[2] ?? DEFAULT_HOST;
  const port = Number.parseInt(process.argv[3] ?? String(DEFAULT_PORT), 10);
  const { server } = await startPlaywrightRealStackServer({ host, port });

  let shuttingDown = false;

  const handleSignal = (signal: string) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    void shutdown(server, 0).catch((error: unknown) => {
      console.error(`[playwright-real-stack] failed to shutdown after ${signal}`, error);
      process.exit(1);
    });
  };

  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));
}

if (require.main === module) {
  void main().catch(async (error: unknown) => {
    console.error("[playwright-real-stack] failed to start", error);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
}
