import * as fs from "fs";
import { createServer } from "http";
import { resolve } from "path";
import { app } from "./app";
import { startScheduledJobs } from "./infrastructure/jobs";
import "./infrastructure/setup/env";
import { getEnv, validateEnvironment } from "./infrastructure/setup/environment";
import { initializeQueues } from "./infrastructure/setup/queues";

// Validate environment variables first
validateEnvironment();

const env = getEnv();
const PORT = env.PORT;

async function bootstrap() {
  console.log("🚀 Starting SpotiArr Backend...\n");

  // Create downloads directory if it doesn't exist
  const downloadsPath = resolve(__dirname, getEnv().DOWNLOADS_PATH);
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log(`✅ Created downloads directory: ${downloadsPath}`);
  }

  // Initialize BullMQ queues
  initializeQueues();

  // Initialize workers
  await import("./infrastructure/workers/track-download.worker");
  await import("./infrastructure/workers/track-search.worker");

  // Create HTTP server
  const httpServer = createServer(app);

  // Start scheduled jobs
  startScheduledJobs();

  // Start server
  // Start server
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ Server running on ${env.BASE_URL}`);
    console.log(`📡 API available at ${env.BASE_URL}/api`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
