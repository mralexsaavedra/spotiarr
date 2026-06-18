import { Worker } from "bullmq";
import { SYNC_STATUS, type FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { SpotifyUserLibraryPort } from "@/application/ports/spotify-user-library.port";
import { getContainer } from "@/container";
import type { ReleaseFeedService } from "../external/release-feed.service";
import { logger } from "../logging/logger";
import type { AppEventBus } from "../messaging/app-event-bus";
import { getEnv } from "../setup/environment";
import { FEED_SYNC_QUEUE } from "../setup/queues";

const log = logger.child({ worker: "feed-sync-worker" });

const RELEASES_SYNC_TTL_HOURS = 24;
const RELEASES_ACTIVITY_WINDOW_DAYS = 90;
const MAX_RELEASES_ARTISTS_PER_CYCLE = 15;

export interface FeedSyncJobDependencies {
  spotifyUserLibrarySyncService: SpotifyUserLibraryPort;
  releaseFeedService: ReleaseFeedService;
  feedRepository: FeedRepositoryPort;
  eventBus: AppEventBus;
  settingsService: SettingsPort;
}

/**
 * Executes a single feed-sync job using the provided dependencies.
 * This function is extracted so it can be unit-tested without instantiating BullMQ.
 */
export async function runFeedSyncJob(deps: FeedSyncJobDependencies): Promise<void> {
  const {
    spotifyUserLibrarySyncService,
    releaseFeedService,
    feedRepository,
    eventBus,
    settingsService,
  } = deps;

  await feedRepository.setSyncState(SYNC_STATUS.Running);

  try {
    const artists = await spotifyUserLibrarySyncService.getFollowedArtists();
    await feedRepository.upsertArtists(artists);

    const releaseCutoff = new Date(Date.now() - RELEASES_SYNC_TTL_HOURS * 60 * 60 * 1000);
    const activityWindow = new Date(
      Date.now() - RELEASES_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const configuredMaxArtistsPerCycle = await settingsService.getNumber(
      "MAX_ACTIVE_ARTISTS_PER_CYCLE",
      MAX_RELEASES_ARTISTS_PER_CYCLE,
    );
    const maxArtistsPerCycle =
      configuredMaxArtistsPerCycle > 0
        ? configuredMaxArtistsPerCycle
        : MAX_RELEASES_ARTISTS_PER_CYCLE;

    const artistIds = await feedRepository.getActiveArtistIdsForReleasesSync(
      releaseCutoff,
      activityWindow,
      maxArtistsPerCycle,
    );

    if (artistIds.length === 0) {
      log.info("No active artists need releases sync");
      await feedRepository.setSyncState(SYNC_STATUS.Idle);
      return;
    }

    log.info({ artistCount: artistIds.length }, "Processing releases for active artists");

    const artistMap = new Map(artists.map((a) => [a.id, a]));
    const artistsToSync = artistIds
      .map((id) => artistMap.get(id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);

    const lookbackDays = await settingsService.getNumber("RELEASES_LOOKBACK_DAYS", 30);

    const { releases } = await releaseFeedService.getActiveArtistReleases(
      artistsToSync.map((a) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.image,
      })),
      { lookbackDays },
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
      log.warn("Circuit breaker open — skipping cycle");
      await feedRepository.setSyncState(SYNC_STATUS.Idle);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    await feedRepository.setSyncState(SYNC_STATUS.Error, message);
    throw error;
  }
}

export function createFeedSyncWorker(): Worker {
  const {
    spotifyUserLibrarySyncService,
    releaseFeedService,
    feedRepository,
    eventBus,
    settingsService,
  } = getContainer();

  // If the process crashed mid-sync, the state is stuck in "running".
  // Reset it on startup so the cron can enqueue a new job.
  feedRepository
    .getSyncState()
    .then((state) => {
      if (state.status === SYNC_STATUS.Running) {
        log.warn("Sync was stuck in 'running' on startup — resetting to idle");
        return feedRepository.setSyncState(SYNC_STATUS.Idle);
      }
    })
    .catch((err) => {
      log.error({ err }, "Failed to check/reset sync state on startup");
    });

  const worker = new Worker(
    FEED_SYNC_QUEUE,
    async () => {
      await runFeedSyncJob({
        spotifyUserLibrarySyncService,
        releaseFeedService,
        feedRepository,
        eventBus,
        settingsService,
      });
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
    log.info({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, error) => {
    log.error({ jobId: job?.id, err: error }, "Job failed");
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
      .catch((err) => {
        log.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "Non-fatal error in failed handler",
        );
      });
  });

  log.info("Feed sync worker initialized");
  return worker;
}
