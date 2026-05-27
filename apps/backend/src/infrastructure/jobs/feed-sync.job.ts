import cron from "node-cron";
import { SYNC_STATUS } from "@/application/ports/feed-repository.port";
import { container } from "@/container";
import { getFeedSyncQueue } from "../setup/queues";

const { settingsService, feedRepository } = container;

let lastFeedSyncCheckTimestamp = 0;

export const feedSyncJob = cron.createTask("* * * * *", async () => {
  try {
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
    console.error("[ScheduledJob] Error enqueuing feed sync job:", error);
  }
});

export function startFeedSyncJob(): void {
  feedSyncJob.start();
}
