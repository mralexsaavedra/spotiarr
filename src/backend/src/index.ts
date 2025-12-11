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
  await import("./infrastructure/workers/track-download.worker");
  await import("./infrastructure/workers/track-search.worker");

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
    // 2. Close Queues
    console.log("⏳ Closing queues...");
    await Promise.allSettled([getTrackDownloadQueue().close(), getTrackSearchQueue().close()]);
    console.log("✅ Queues closed");

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
