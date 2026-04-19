import { Worker } from "bullmq";
import { container } from "@/container";
import { SYNC_STATUS } from "../database/feed.repository";
import { getEnv } from "../setup/environment";
import { FEED_SYNC_QUEUE } from "../setup/queues";

const { spotifyUserLibrarySyncService, feedRepository, eventBus } = container;

export function createFeedSyncWorker(): Worker {
  // If the process crashed mid-sync, the state is stuck in "running".
  // Reset it on startup so the cron can enqueue a new job.
  feedRepository
    .getSyncState()
    .then((state) => {
      if (state.status === SYNC_STATUS.Running) {
        console.warn("[FeedSyncWorker] Sync was stuck in 'running' on startup — resetting to idle");
        return feedRepository.setSyncState(SYNC_STATUS.Idle);
      }
    })
    .catch((err) => {
      console.error("[FeedSyncWorker] Failed to check/reset sync state on startup", err);
    });

  const worker = new Worker(
    FEED_SYNC_QUEUE,
    async () => {
      await feedRepository.setSyncState(SYNC_STATUS.Running);

      try {
        const artists = await spotifyUserLibrarySyncService.getFollowedArtists();
        await feedRepository.upsertArtists(artists);

        // Skip artists whose data was synced in the last 24h — no need to
        // re-fetch from Spotify if the data is already fresh in the DB.
        const freshnessCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [freshAlbumIds, freshReleaseIds, emptyArtistIds] = await Promise.all([
          feedRepository.getArtistIdsWithFreshAlbums(freshnessCutoff),
          feedRepository.getArtistIdsWithFreshReleases(freshnessCutoff),
          feedRepository.getArtistIdsWithNoAlbums(),
        ]);

        const staleAlbumCount = artists.length - freshAlbumIds.size;
        const staleReleaseCount = artists.length - freshReleaseIds.size;

        // Cap Spotify calls per cycle to avoid rate limiting.
        // Artists with NO data at all are prioritized — they are the ones
        // causing "rate limited" messages when users visit them.
        // Stale artists (have data but >24h old) are processed after empty ones.
        const MAX_ARTISTS_PER_CYCLE = 25;
        console.log(
          `[FeedSyncWorker] Albums: ${freshAlbumIds.size}/${artists.length} fresh, ${emptyArtistIds.size} empty (priority), ${staleAlbumCount - emptyArtistIds.size} stale — processing up to ${MAX_ARTISTS_PER_CYCLE} this cycle`,
        );

        const artistAlbums = await spotifyUserLibrarySyncService.getFollowedArtistsAlbumsSnapshot(
          50,
          freshAlbumIds,
          MAX_ARTISTS_PER_CYCLE,
          emptyArtistIds,
        );
        await feedRepository.upsertArtistAlbums(artistAlbums);

        const releases = await spotifyUserLibrarySyncService.getFollowedArtistsRecentReleases(
          freshReleaseIds,
          MAX_ARTISTS_PER_CYCLE,
        );
        await feedRepository.upsertReleases(releases);

        await feedRepository.evictStaleFeedCache(artists.map((a) => a.id));

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
    // Ensure sync state is never left as "running" if BullMQ marks the job failed
    // (e.g. stalled job after process restart, or unhandled rejection)
    feedRepository
      .getSyncState()
      .then((state) => {
        if (state.status === SYNC_STATUS.Running) {
          return feedRepository.setSyncState(
            SYNC_STATUS.Error,
            error instanceof Error ? error.message : String(error),
          );
        }
      })
      .catch(() => {});
  });

  console.log("✅ Feed sync worker initialized");
  return worker;
}
