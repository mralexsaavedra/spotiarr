import { EventEmitter } from "events";
import * as fs from "fs";
import * as http from "http";
import { createApp } from "./app";
import { initializeContainer } from "./container";
import { PrismaSettingsRepository } from "./infrastructure/database/prisma-settings.repository";
import {
  configureAppTokenCircuitBreaker,
  configureSpotifyRateLimiters,
} from "./infrastructure/external/spotify-http.client";
import { startScheduledJobs } from "./infrastructure/jobs";
import { getEnv, validateEnvironment } from "./infrastructure/setup/environment";
import { prisma } from "./infrastructure/setup/prisma";
import { initializeQueues } from "./infrastructure/setup/queues";
import {
  getArtworkBackfillQueue,
  getCatalogSyncQueue,
  getFeedSyncQueue,
  getTrackDownloadQueue,
  getTrackSearchQueue,
} from "./infrastructure/setup/queues";

const CIRCUIT_BREAKER_OPEN_UNTIL_KEY = "spotify_circuit_open_until";

// Validate environment variables first
validateEnvironment();

const env = getEnv();

if (env.SPOTIARR_TOKEN && !env.SPOTIARR_TRUST_PROXY) {
  console.warn(
    "⚠️  [Auth] SPOTIARR_TOKEN is set but SPOTIARR_TRUST_PROXY is not. " +
      "Behind a reverse proxy you MUST set SPOTIARR_TRUST_PROXY (e.g. 1), otherwise: " +
      "(a) the session cookie will NOT get the Secure flag (req.secure stays false), and " +
      "(b) per-client rate limiting collapses to a single shared bucket (req.ip becomes the proxy IP).",
  );
}

configureSpotifyRateLimiters(env);
const PORT = 3000;

// Worker references for shutdown
let downloadWorker: import("bullmq").Worker;
let searchWorker: import("bullmq").Worker;
let feedSyncWorker: import("bullmq").Worker;
let catalogSyncWorker: import("bullmq").Worker;
let artworkBackfillWorker: import("bullmq").Worker;

async function bootstrap() {
  console.log("🚀 Starting SpotiArr Backend...\n");

  const container = initializeContainer(env);

  // Create downloads directory if it doesn't exist
  const downloadsPath = env.DOWNLOADS;
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log(`✅ Created downloads directory: ${downloadsPath}`);
  }

  // Initialize BullMQ queues
  initializeQueues();

  // Restore circuit breaker state from SQLite so a process restart does NOT
  // immediately hammer Spotify if the circuit was open before shutdown.
  const settingsRepo = new PrismaSettingsRepository();
  const savedOpenUntil = await settingsRepo.get(CIRCUIT_BREAKER_OPEN_UNTIL_KEY);
  const initialOpenUntilMs = savedOpenUntil ? parseInt(savedOpenUntil, 10) : 0;
  configureAppTokenCircuitBreaker(initialOpenUntilMs, async (openUntilMs) => {
    await settingsRepo.set(CIRCUIT_BREAKER_OPEN_UNTIL_KEY, openUntilMs.toString()).catch((err) => {
      console.error("[CircuitBreaker] Failed to persist open-until timestamp", err);
    });
  });

  // Initialize workers
  const { createTrackDownloadWorker } =
    await import("./infrastructure/workers/track-download.worker");
  downloadWorker = await createTrackDownloadWorker();

  const { createTrackSearchWorker } = await import("./infrastructure/workers/track-search.worker");
  searchWorker = await createTrackSearchWorker();

  const { createFeedSyncWorker } = await import("./infrastructure/workers/feed-sync.worker");
  feedSyncWorker = createFeedSyncWorker();

  const { createCatalogSyncWorker } = await import("./infrastructure/workers/catalog-sync.worker");
  catalogSyncWorker = createCatalogSyncWorker();

  const { createArtworkBackfillWorker } =
    await import("./infrastructure/workers/artwork-backfill.worker");
  artworkBackfillWorker = createArtworkBackfillWorker();

  // Listen for settings updates to hot-reload workers
  (container.eventBus as unknown as EventEmitter).on(
    "settings:updated",
    async ({ key }: { key: string }) => {
      if (key === "YT_SEARCH_CONCURRENCY") {
        console.log("♻️  Settings changed: Reloading search worker...");
        await searchWorker.close();
        searchWorker = await createTrackSearchWorker();
      }
      if (key === "YT_DOWNLOADS_PER_MINUTE") {
        console.log("♻️  Settings changed: Reloading download worker...");
        await downloadWorker.close();
        downloadWorker = await createTrackDownloadWorker();
      }
    },
  );

  // Check for stuck tracks and rescue them
  await container.rescueStuckTracksUseCase.execute();

  // Create HTTP server
  const app = createApp(container);
  const server = http.createServer(app);

  // Start scheduled jobs
  startScheduledJobs();

  // Start server
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ SpotiArr is running!`);
    console.log(`-------------------------------------------`);
    console.log(`🌍 Web UI:   http://localhost:${PORT}`);
    console.log(`📡 API URL:  http://localhost:${PORT}/api`);
    console.log(`-------------------------------------------`);

    if (env.NODE_ENV === "development") {
      console.log(`💻 Dev Frontend: http://localhost:5173`);
    }
  });

  return server;
}

const gracefulShutdown = async (signal: string, server: http.Server) => {
  console.log(`\n[${signal}] Signal received: closing application...`);

  // 1. Close HTTP Server
  server.close(() => {
    console.log("✅ HTTP server closed");
  });

  try {
    // 2. Close Queues and Workers
    console.log("⏳ Closing queues and workers...");
    await Promise.allSettled([
      getTrackDownloadQueue().close(),
      getTrackSearchQueue().close(),
      getFeedSyncQueue().close(),
      getCatalogSyncQueue().close(),
      getArtworkBackfillQueue().close(),
      downloadWorker?.close(),
      searchWorker?.close(),
      feedSyncWorker?.close(),
      catalogSyncWorker?.close(),
      artworkBackfillWorker?.close(),
    ]);
    console.log("✅ Queues and workers closed");

    // 3. Disconnect Database
    console.log("⏳ Disconnecting database...");
    await prisma.$disconnect();
    console.log("✅ Database disconnected");

    console.log("👋 Graceful shutdown complete. Exiting.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during graceful shutdown:", error);
    process.exit(1);
  }
};

bootstrap()
  .then((server) => {
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM", server));
    process.on("SIGINT", () => gracefulShutdown("SIGINT", server));
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });
