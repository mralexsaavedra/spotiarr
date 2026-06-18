import cron from "node-cron";
import { SYNC_STATUS } from "@/application/ports/feed-repository.port";
import { getContainer } from "@/container";
import { logger } from "../logging/logger";
import { getCatalogSyncQueue } from "../setup/queues";

const log = logger.child({ job: "catalog-sync-job" });

let lastCatalogSyncCheckTimestamp = 0;

export const catalogSyncJob = cron.createTask("* * * * *", async () => {
  try {
    const { settingsService, feedRepository } = getContainer();
    const intervalHours = await settingsService.getNumber("CATALOG_SYNC_INTERVAL_HOURS", 6);
    const safeIntervalHours = intervalHours > 0 ? intervalHours : 6;
    const now = Date.now();

    if (now - lastCatalogSyncCheckTimestamp < safeIntervalHours * 60 * 60_000) {
      return;
    }

    const syncState = await feedRepository.getCatalogSyncState();
    const feedSyncState = await feedRepository.getSyncState();

    if (syncState.status === SYNC_STATUS.Running || feedSyncState.status === SYNC_STATUS.Running) {
      return;
    }

    await getCatalogSyncQueue().add(
      "catalog-sync",
      {},
      {
        jobId: `catalog-sync-${now}`,
      },
    );

    lastCatalogSyncCheckTimestamp = now;
  } catch (error) {
    log.error({ err: error }, "Error enqueuing catalog sync job");
  }
});

export function startCatalogSyncJob(): void {
  catalogSyncJob.start();
}
