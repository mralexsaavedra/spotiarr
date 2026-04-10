import { Worker } from "bullmq";
import { container } from "@/container";
import { SYNC_STATUS } from "../database/feed.repository";
import { getEnv } from "../setup/environment";
import { FEED_SYNC_QUEUE } from "../setup/queues";

const { spotifyUserLibrarySyncService, feedRepository, eventBus } = container;

export function createFeedSyncWorker(): Worker {
  const worker = new Worker(
    FEED_SYNC_QUEUE,
    async () => {
      await feedRepository.setSyncState(SYNC_STATUS.Running);

      try {
        const artists = await spotifyUserLibrarySyncService.getFollowedArtists();
        await feedRepository.upsertArtists(artists);

        const artistAlbums = await spotifyUserLibrarySyncService.getFollowedArtistsAlbumsSnapshot();
        await feedRepository.upsertArtistAlbums(artistAlbums);

        const releases = await spotifyUserLibrarySyncService.getFollowedArtistsRecentReleases();
        await feedRepository.upsertReleases(releases);

        await feedRepository.setSyncState(SYNC_STATUS.Idle);
        eventBus.emit("feed-updated", { artists: artists.length, releases: releases.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await feedRepository.setSyncState(SYNC_STATUS.Error, message);
        throw error;
      }
    },
    {
      connection: {
        host: getEnv().REDIS_HOST,
        port: getEnv().REDIS_PORT,
      },
      concurrency: 1,
      lockDuration: 5 * 60_000,
      stalledInterval: 60_000,
      maxStalledCount: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[FeedSyncWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[FeedSyncWorker] Job ${job?.id} failed`, error);
  });

  console.log("✅ Feed sync worker initialized");
  return worker;
}
