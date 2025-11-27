import { Queue } from "bullmq";
import { EnvironmentEnum } from "../setup/environment";

let trackDownloadQueue: Queue;
let trackSearchQueue: Queue;

export function initializeQueues(): void {
  const connection = {
    host: process.env[EnvironmentEnum.REDIS_HOST] || "localhost",
    port: parseInt(process.env[EnvironmentEnum.REDIS_PORT] || "6379"),
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
