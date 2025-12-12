import { EventEmitter } from "events";
import * as fs from "fs";
import * as http from "http";
import { app } from "./app";
import { container } from "./container";
import { startScheduledJobs } from "./infrastructure/jobs";
import { getEnv, validateEnvironment } from "./infrastructure/setup/environment";
import { prisma } from "./infrastructure/setup/prisma";
import { initializeQueues } from "./infrastructure/setup/queues";
import { getTrackDownloadQueue, getTrackSearchQueue } from "./infrastructure/setup/queues";

// Validate environment variables first
validateEnvironment();

const env = getEnv();
const PORT = 3000;

// Worker references for shutdown
let downloadWorker: import("bullmq").Worker;
let searchWorker: import("bullmq").Worker;

async function bootstrap() {
  console.log("🚀 Starting SpotiArr Backend...\n");

  // Create downloads directory if it doesn't exist
  const downloadsPath = env.DOWNLOADS;
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log(`✅ Created downloads directory: ${downloadsPath}`);
  }

  // Initialize BullMQ queues
  initializeQueues();

  // Initialize workers
  const { createTrackDownloadWorker } = await import(
    "./infrastructure/workers/track-download.worker"
  );
  downloadWorker = await createTrackDownloadWorker();

  const { createTrackSearchWorker } = await import("./infrastructure/workers/track-search.worker");
  searchWorker = await createTrackSearchWorker();

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
      downloadWorker?.close(),
      searchWorker?.close(),
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
