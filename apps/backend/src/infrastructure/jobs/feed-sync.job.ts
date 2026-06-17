import cron from "node-cron";
import { SYNC_STATUS } from "@/application/ports/feed-repository.port";
import { getContainer } from "@/container";
import { logger } from "../logging/logger";
import { getFeedSyncQueue } from "../setup/queues";

const log = logger.child({ job: "feed-sync-job" });

let lastFeedSyncCheckTimestamp = 0;

export const feedSyncJob = cron.createTask("* * * * *", async () => {
  try {
    const { settingsService, feedRepository } = getContainer();
    const intervalMinutes = await settingsService.getNumber("RELEASES_SYNC_INTERVAL_MINUTES", 60);
    const safeIntervalMinutes = intervalMinutes > 0 ? intervalMinutes : 60;
    const now = Date.now();

    if (now - lastFeedSyncCheckTimestamp < safeIntervalMinutes * 60_000) {
      return;
    }

    const syncState = await feedRepository.getSyncState();

    if (syncState.status === SYNC_STATUS.Running) {
      return;
    }

    await getFeedSyncQueue().add(
      "feed-sync",
      {},
      {
        jobId: `feed-sync-${now}`,
      },
    );

    lastFeedSyncCheckTimestamp = now;
  } catch (error) {
    log.error({ err: error }, "Error enqueuing feed sync job");
  }
});

export function startFeedSyncJob(): void {
  feedSyncJob.start();
}
