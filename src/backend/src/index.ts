import * as fs from "fs";
import { createServer } from "http";
import { resolve } from "path";
import { app } from "./app";
import "./env";
import { startScheduledJobs } from "./jobs";
import { validateEnvironment } from "./setup/environment";
import { initializeQueues } from "./setup/queues";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  console.log("🚀 Starting SpotiArr Backend...\n");

  // Validate environment variables
  validateEnvironment();

  // Create downloads directory if it doesn't exist
  const downloadsPath = resolve(__dirname, process.env.DOWNLOADS_PATH || "../downloads");
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log(`✅ Created downloads directory: ${downloadsPath}`);
  }

  // Initialize BullMQ queues
  initializeQueues();

  // Initialize workers
  await import("./workers/track-download.worker");
  await import("./workers/track-search.worker");

  // Create HTTP server
  const httpServer = createServer(app);

  // Start scheduled jobs
  startScheduledJobs();

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
