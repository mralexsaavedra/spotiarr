import { Queue } from "bullmq";
import { getEnv } from "../setup/environment";

let trackDownloadQueue: Queue;
let trackSearchQueue: Queue;

export function initializeQueues(): void {
  const env = getEnv();
  const connection = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  };

  trackDownloadQueue = new Queue("track-download-processor", {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
    },
  });

  trackSearchQueue = new Queue("track-search-processor", {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
    },
  });

  console.log("✅ BullMQ queues initialized");
}

export function getTrackDownloadQueue(): Queue {
  if (!trackDownloadQueue) {
    throw new Error("Track download queue not initialized");
  }
  return trackDownloadQueue;
}

export function getTrackSearchQueue(): Queue {
  if (!trackSearchQueue) {
    throw new Error("Track search queue not initialized");
  }
  return trackSearchQueue;
}
