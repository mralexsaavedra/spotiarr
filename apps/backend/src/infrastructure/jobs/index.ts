import { TrackStatusEnum } from "@spotiarr/shared";
import cron from "node-cron";
import { getContainer } from "../../container";
import { logger } from "../logging/logger";
import { startCatalogSyncJob } from "./catalog-sync.job";
import { startFeedSyncJob } from "./feed-sync.job";

const log = logger.child({ component: "scheduled-jobs" });

let lastPlaylistCheckTimestamp = 0;
let lastStuckTracksCleanupTimestamp = 0;
let lastRecoveryTimestamp = 0;

// Global Error-recovery: re-drives Error tracks for ALL playlist origins
// (subscribed, non-subscribed, synthetic spotiarr://, album, AI). This
// replaces the subscribed-only re-enqueue that used to live in the playlist
// sync, so subscribed tracks now recover on this interval (default 5 min)
// instead of waiting for the 60-min playlist sync.
export const recoverErroredTracksJob = cron.createTask("* * * * *", async () => {
  try {
    const { recoverErroredTracksUseCase, settingsService } = getContainer();
    const intervalMinutes = await settingsService.getNumber("RECOVERY_JOB_INTERVAL_MINUTES");
    const safeIntervalMinutes = intervalMinutes > 0 ? intervalMinutes : 5;
    const now = Date.now();

    if (now - lastRecoveryTimestamp < safeIntervalMinutes * 60_000) {
      return;
    }

    lastRecoveryTimestamp = now;
    log.info("Running errored-tracks recovery...");
    await recoverErroredTracksUseCase.execute();
    log.info("Errored-tracks recovery completed");
  } catch (error) {
    log.error({ err: error }, "Error recovering errored tracks");
  }
});

export const checkPlaylistsJob = cron.createTask("* * * * *", async () => {
  try {
    const { playlistService, settingsService } = getContainer();
    const intervalMinutes = await settingsService.getNumber("PLAYLIST_CHECK_INTERVAL_MINUTES");
    const safeIntervalMinutes = intervalMinutes > 0 ? intervalMinutes : 60;
    const now = Date.now();

    if (now - lastPlaylistCheckTimestamp < safeIntervalMinutes * 60_000) {
      return;
    }

    log.info("Running playlist check...");
    await playlistService.checkSubscribedPlaylists();
    lastPlaylistCheckTimestamp = now;
    log.info("Playlist check completed");
  } catch (error) {
    log.error({ err: error }, "Error checking playlists");
  }
});

export const cleanStuckTracksJob = cron.createTask("* * * * *", async () => {
  try {
    const { trackService, settingsService, eventBus } = getContainer();
    const cleanupIntervalMinutes = await settingsService.getNumber(
      "STUCK_TRACKS_CLEANUP_INTERVAL_MINUTES",
    );
    const timeoutMinutes = await settingsService.getNumber("STUCK_TRACKS_TIMEOUT_MINUTES");

    const safeCleanupInterval = cleanupIntervalMinutes > 0 ? cleanupIntervalMinutes : 5;
    const safeTimeout = timeoutMinutes > 0 ? timeoutMinutes : 10;
    const now = Date.now();

    if (now - lastStuckTracksCleanupTimestamp < safeCleanupInterval * 60_000) {
      return;
    }

    const stuckTracks = await trackService.findStuckTracks(
      [
        TrackStatusEnum.New,
        TrackStatusEnum.Queued,
        TrackStatusEnum.Downloading,
        TrackStatusEnum.Searching,
      ],
      now - safeTimeout * 60 * 1000,
    );

    if (stuckTracks.length > 0) {
      log.info({ count: stuckTracks.length }, "Found stuck tracks, marking as error");
      for (const track of stuckTracks) {
        if (track.id && track.status) {
          // CAS: only mark Error if the track is STILL in the stuck status we
          // observed. If it progressed (e.g. download completed) between the
          // query and now, the write is a no-op — the killer must not clobber
          // a track that legitimately moved on.
          await trackService.updateStatusIf(track.id, track.status, {
            status: TrackStatusEnum.Error,
            error:
              track.error ||
              `Track was stuck in processing state for more than ${safeTimeout} minutes`,
          });
        }
      }
      eventBus.emit("playlists-updated");
    }

    lastStuckTracksCleanupTimestamp = now;
  } catch (error) {
    log.error({ err: error }, "Error cleaning stuck tracks");
  }
});

export function startScheduledJobs(): void {
  recoverErroredTracksJob.start();
  checkPlaylistsJob.start();
  cleanStuckTracksJob.start();
  startFeedSyncJob();
  startCatalogSyncJob();
  log.info("Scheduled jobs started (intervals configurable in Settings)");
}
