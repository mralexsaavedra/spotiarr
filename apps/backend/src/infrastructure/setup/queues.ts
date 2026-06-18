import { Queue } from "bullmq";
import { AppError } from "@/domain/errors/app-error";
import { logger } from "@/infrastructure/logging/logger";
import { getEnv } from "../setup/environment";

export const FEED_SYNC_QUEUE = "feed-sync-queue";
export const CATALOG_SYNC_QUEUE = "catalog-sync-queue";
export const ARTWORK_BACKFILL_QUEUE = "artwork-backfill-queue";
export const AI_PLAYLIST_QUEUE = "ai-playlist-processor";

let trackDownloadQueue: Queue;
let trackSearchQueue: Queue;
let feedSyncQueue: Queue;
let catalogSyncQueue: Queue;
let artworkBackfillQueue: Queue;
let aiPlaylistQueue: Queue;

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

  catalogSyncQueue = new Queue(CATALOG_SYNC_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
    },
  });

  artworkBackfillQueue = new Queue(ARTWORK_BACKFILL_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
    },
  });

  aiPlaylistQueue = new Queue(AI_PLAYLIST_QUEUE, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
    },
  });

  logger.info({ component: "queues" }, "BullMQ queues initialized");
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

export function getCatalogSyncQueue(): Queue {
  if (!catalogSyncQueue) {
    throw new AppError(500, "internal_server_error", "Catalog sync queue not initialized");
  }
  return catalogSyncQueue;
}

export function getArtworkBackfillQueue(): Queue {
  if (!artworkBackfillQueue) {
    throw new AppError(500, "internal_server_error", "Artwork backfill queue not initialized");
  }
  return artworkBackfillQueue;
}

export function getAiPlaylistQueue(): Queue {
  if (!aiPlaylistQueue) {
    throw new AppError(500, "internal_server_error", "AI playlist queue not initialized");
  }
  return aiPlaylistQueue;
}
