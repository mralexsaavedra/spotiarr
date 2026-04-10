import { Queue } from "bullmq";
import { AppError } from "@/domain/errors/app-error";
import { getEnv } from "../setup/environment";

export const FEED_SYNC_QUEUE = "feed-sync-queue";

let trackDownloadQueue: Queue;
let trackSearchQueue: Queue;
let feedSyncQueue: Queue;

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

  feedSyncQueue = new Queue(FEED_SYNC_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
    },
  });

  console.log("✅ BullMQ queues initialized");
}

export function getTrackDownloadQueue(): Queue {
  if (!trackDownloadQueue) {
    throw new AppError(500, "internal_server_error", "Track download queue not initialized");
  }
  return trackDownloadQueue;
}

export function getTrackSearchQueue(): Queue {
  if (!trackSearchQueue) {
    throw new AppError(500, "internal_server_error", "Track search queue not initialized");
  }
  return trackSearchQueue;
}

export function getFeedSyncQueue(): Queue {
  if (!feedSyncQueue) {
    throw new AppError(500, "internal_server_error", "Feed sync queue not initialized");
  }
  return feedSyncQueue;
}
