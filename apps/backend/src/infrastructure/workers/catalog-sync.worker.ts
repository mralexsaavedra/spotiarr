import { Worker } from "bullmq";
import { container } from "@/container";
import { SYNC_STATUS } from "../database/feed.repository";
import { getEnv } from "../setup/environment";
import { CATALOG_SYNC_QUEUE } from "../setup/queues";

const { spotifyUserLibrarySyncService, feedRepository, eventBus, settingsService } = container;

const CATALOG_SYNC_TTL_DAYS = 7;

export function createCatalogSyncWorker(): Worker {
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
    async () => {
      await feedRepository.setCatalogSyncState(SYNC_STATUS.Running);

      try {
        const artists = await spotifyUserLibrarySyncService.getFollowedArtists();
        await feedRepository.upsertArtists(artists);

        const cutoffDate = new Date(Date.now() - CATALOG_SYNC_TTL_DAYS * 24 * 60 * 60 * 1000);

        const maxArtistsPerCycle = await settingsService.getNumber(
          "MAX_CATALOG_ARTISTS_PER_CYCLE",
          5,
        );

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

        const lookbackDays = await container.settingsService.getNumber(
          "CATALOG_LOOKBACK_DAYS",
          365,
        );
        const safeLookbackDays = lookbackDays > 0 ? lookbackDays : 365;
        const earlyStopBeforeDate = new Date(Date.now() - safeLookbackDays * 24 * 60 * 60 * 1000);

        const allAlbums: import("@spotiarr/shared").ArtistRelease[] = [];
        let successCount = 0;
        const failedArtistIds: string[] = [];

        for (const artist of artistsToSync) {
          try {
            const albums = await spotifyUserLibrarySyncService.getArtistCatalogData(
              [
                {
                  id: artist.id,
                  name: artist.name,
                  imageUrl: artist.image,
                },
              ],
              earlyStopBeforeDate,
            );

            await feedRepository.upsertArtistAlbums(albums);
            await feedRepository.updateArtistCatalogSyncedAt([artist.id]);
            allAlbums.push(...albums);
            successCount++;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            // Circuit breaker open — abort cycle gracefully, don't hammer Spotify
            if (
              error instanceof Error &&
              "errorCode" in error &&
              (error as { errorCode: string }).errorCode === "circuit_open"
            ) {
              console.warn(
                `[CatalogSyncWorker] Circuit breaker open — aborting cycle after ${successCount} artists`,
              );
              break;
            }
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
    },
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
