import { Worker } from "bullmq";
import { SYNC_STATUS, type FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { ReleaseFeedPort } from "@/application/ports/release-feed.port";
import type { SettingsService } from "@/application/services/settings.service";
import { getContainer } from "@/container";
import type { AppEventBus } from "../messaging/app-event-bus";
import { getEnv } from "../setup/environment";
import { CATALOG_SYNC_QUEUE } from "../setup/queues";

export interface CatalogSyncJobDependencies {
  feedRepository: FeedRepositoryPort;
  releaseFeedService: ReleaseFeedPort;
  eventBus: AppEventBus;
  settingsService: SettingsService;
}

const CATALOG_SYNC_TTL_DAYS = 7;

export async function runCatalogSyncJob(deps: CatalogSyncJobDependencies): Promise<void> {
  const { feedRepository, settingsService, releaseFeedService, eventBus } = deps;

  await feedRepository.setCatalogSyncState(SYNC_STATUS.Running);

  try {
    const artists = await feedRepository.getArtists();

    if (artists.length === 0) {
      console.log("[CatalogSyncWorker] No artists in DB cache — skipping catalog cycle");
      await feedRepository.setCatalogSyncState(SYNC_STATUS.Idle);
      eventBus.emit("catalog-updated", { artists: 0, albums: 0 });
      return;
    }

    const cutoffDate = new Date(Date.now() - CATALOG_SYNC_TTL_DAYS * 24 * 60 * 60 * 1000);
    const maxArtistsPerCycle = await settingsService.getNumber("MAX_CATALOG_ARTISTS_PER_CYCLE", 5);

    const artistIds = await feedRepository.getArtistIdsNeedingCatalogSync(
      cutoffDate,
      maxArtistsPerCycle,
    );

    if (artistIds.length === 0) {
      console.log("[CatalogSyncWorker] No artists need catalog sync");
      await feedRepository.setCatalogSyncState(SYNC_STATUS.Idle);
      return;
    }

    console.log(`[CatalogSyncWorker] Processing catalog for ${artistIds.length} artists`);

    const artistMap = new Map(artists.map((a) => [a.id, a]));
    const artistsToSync = artistIds
      .map((id) => artistMap.get(id))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);

    const allAlbums: import("@spotiarr/shared").ArtistRelease[] = [];
    let successCount = 0;
    const failedArtistIds: string[] = [];

    for (const artist of artistsToSync) {
      try {
        const result = await releaseFeedService.getArtistDiscography({
          id: artist.id,
          name: artist.name,
          imageUrl: artist.image,
        });

        const albums = result.albums;
        await feedRepository.upsertArtistAlbums(albums);
        await feedRepository.updateArtistCatalogSyncedAt([artist.id]);
        allAlbums.push(...albums);
        successCount++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[CatalogSyncWorker] Failed to sync artist ${artist.id}:`, message);
        failedArtistIds.push(artist.id);
      }
    }

    console.log(
      `[CatalogSyncWorker] Synced ${successCount}/${artistsToSync.length} artists (${failedArtistIds.length} failed)`,
    );

    if (successCount === 0) {
      const errorMessage =
        failedArtistIds.length > 0
          ? `All artists failed to sync. First failures: ${failedArtistIds.slice(0, 3).join(", ")}`
          : "No artists were synced";
      await feedRepository.setCatalogSyncState(SYNC_STATUS.Error, errorMessage);
      throw new Error(errorMessage);
    }

    await feedRepository.setCatalogSyncState(SYNC_STATUS.Idle);
    eventBus.emit("catalog-updated", {
      artists: successCount,
      albums: allAlbums.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await feedRepository.setCatalogSyncState(SYNC_STATUS.Error, message);
    throw error;
  }
}

export function createCatalogSyncWorker(): Worker {
  const { feedRepository, releaseFeedService, eventBus, settingsService } = getContainer();

  // If the process crashed mid-sync, the state is stuck in "running".
  // Reset it on startup so the cron can enqueue a new job.
  feedRepository
    .getCatalogSyncState()
    .then((state) => {
      if (state.status === SYNC_STATUS.Running) {
        console.warn(
          "[CatalogSyncWorker] Sync was stuck in 'running' on startup — resetting to idle",
        );
        return feedRepository.setCatalogSyncState(SYNC_STATUS.Idle);
      }
    })
    .catch((err) => {
      console.error("[CatalogSyncWorker] Failed to check/reset sync state on startup", err);
    });

  const worker = new Worker(
    CATALOG_SYNC_QUEUE,
    async () =>
      runCatalogSyncJob({ feedRepository, releaseFeedService, eventBus, settingsService }),
    {
      connection: {
        host: getEnv().REDIS_HOST,
        port: getEnv().REDIS_PORT,
      },
      concurrency: 1,
      lockDuration: 30 * 60_000,
      stalledInterval: 60_000,
      maxStalledCount: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[CatalogSyncWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[CatalogSyncWorker] Job ${job?.id} failed`, error);
    feedRepository
      .getCatalogSyncState()
      .then((state) => {
        if (state.status === SYNC_STATUS.Running) {
          return feedRepository.setCatalogSyncState(
            SYNC_STATUS.Error,
            error instanceof Error ? error.message : String(error),
          );
        }
      })
      .catch(() => {});
  });

  console.log("✅ Catalog sync worker initialized");
  return worker;
}
