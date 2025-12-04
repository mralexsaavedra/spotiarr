import * as fs from "fs";
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

  // Check for SSL certificates
  const certPath = resolve(__dirname, "../../../config/server.cert");
  const keyPath = resolve(__dirname, "../../../config/server.key");

  // In production (dist), paths might be different relative to __dirname
  // Dev: src/backend/src/index.ts -> ../../../config
  // Prod: src/backend/dist/index.js -> ../../../config (mapped volume)

  let server;
  let protocol = "http";

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    try {
      const https = await import("https");
      const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      server = https.createServer(options, app);
      protocol = "https";
      console.log("🔒 SSL Certificates found. Starting HTTPS server.");
    } catch (error) {
      console.error("⚠️ Failed to load SSL certificates, falling back to HTTP:", error);
      const http = await import("http");
      server = http.createServer(app);
    }
  } else {
    console.log("⚠️ No SSL certificates found at config/server.{cert,key}. Starting HTTP server.");
    const http = await import("http");
    server = http.createServer(app);
  }

  // Start scheduled jobs
  startScheduledJobs();

  // Start server
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✅ Server running on ${env.BASE_URL}`);
    console.log(`📡 API available at ${env.BASE_URL}/api`);
  });
}

bootstrap().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
