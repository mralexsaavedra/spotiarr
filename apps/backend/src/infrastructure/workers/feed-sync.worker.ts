import { Worker } from "bullmq";
import { container } from "@/container";
import { SYNC_STATUS } from "../database/feed.repository";
import { getEnv } from "../setup/environment";
import { FEED_SYNC_QUEUE } from "../setup/queues";

const {
  spotifyUserLibrarySyncService,
  releaseFeedService,
  feedRepository,
  eventBus,
  settingsService,
} = container;

const RELEASES_SYNC_TTL_HOURS = 24;
const RELEASES_ACTIVITY_WINDOW_DAYS = 90;
const MAX_RELEASES_ARTISTS_PER_CYCLE = 15;

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

        const releaseCutoff = new Date(Date.now() - RELEASES_SYNC_TTL_HOURS * 60 * 60 * 1000);
        const activityWindow = new Date(
          Date.now() - RELEASES_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
        );

        const maxArtistsPerCycle =
          (await settingsService.getNumber("MAX_ACTIVE_ARTISTS_PER_CYCLE", 15)) > 0
            ? await settingsService.getNumber("MAX_ACTIVE_ARTISTS_PER_CYCLE", 15)
            : MAX_RELEASES_ARTISTS_PER_CYCLE;

        const artistIds = await feedRepository.getActiveArtistIdsForReleasesSync(
          releaseCutoff,
          activityWindow,
          maxArtistsPerCycle,
        );

        if (artistIds.length === 0) {
          console.log("[FeedSyncWorker] No active artists need releases sync");
          await feedRepository.setSyncState(SYNC_STATUS.Idle);
          return;
        }

        console.log(`[FeedSyncWorker] Processing releases for ${artistIds.length} active artists`);

        const artistMap = new Map(artists.map((a) => [a.id, a]));
        const artistsToSync = artistIds
          .map((id) => artistMap.get(id))
          .filter((a): a is NonNullable<typeof a> => a !== undefined);

        const { releases } = await releaseFeedService.getActiveArtistReleases(
          artistsToSync.map((a) => ({
            id: a.id,
            name: a.name,
            imageUrl: a.image,
          })),
        );

        await feedRepository.upsertReleases(releases);
        await feedRepository.updateArtistReleasesSyncedAt(artistIds);

        await feedRepository.evictStaleFeedCache(artists.map((a) => a.id));

        await feedRepository.setSyncState(SYNC_STATUS.Idle);
        eventBus.emit("feed-updated", { artists: artists.length, releases: releases.length });
      } catch (error) {
        // Circuit breaker open — abort gracefully, next cycle will retry
        if (
          error instanceof Error &&
          "errorCode" in error &&
          (error as { errorCode: string }).errorCode === "circuit_open"
        ) {
          console.warn("[FeedSyncWorker] Circuit breaker open — skipping cycle");
          await feedRepository.setSyncState(SYNC_STATUS.Idle);
          return;
        }
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
