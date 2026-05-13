import cron from "node-cron";
import { container } from "@/container";
import { SYNC_STATUS } from "../database/feed.repository";
import { getCatalogSyncQueue } from "../setup/queues";

const { settingsService, feedRepository } = container;

let lastCatalogSyncCheckTimestamp = 0;

export const catalogSyncJob = cron.schedule("* * * * *", async () => {
  try {
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
    console.error("[ScheduledJob] Error enqueuing catalog sync job:", error);
  }
});

export function startCatalogSyncJob(): void {
  catalogSyncJob.start();
}
