import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import cron from "node-cron";
import { container } from "../../container";

const { playlistService, settingsService, trackService, eventBus } = container;

let lastPlaylistCheckTimestamp = 0;
let lastStuckTracksCleanupTimestamp = 0;

export const checkPlaylistsJob = cron.schedule("* * * * *", async () => {
  try {
    const intervalMinutes = await settingsService.getNumber("PLAYLIST_CHECK_INTERVAL_MINUTES");
    const safeIntervalMinutes = intervalMinutes > 0 ? intervalMinutes : 60;
    const now = Date.now();

    if (now - lastPlaylistCheckTimestamp < safeIntervalMinutes * 60_000) {
      return;
    }

    console.log("[ScheduledJob] Running playlist check...");
    await playlistService.checkSubscribedPlaylists();
    lastPlaylistCheckTimestamp = now;
    console.log("[ScheduledJob] Playlist check completed");
  } catch (error) {
    console.error("[ScheduledJob] Error checking playlists:", error);
  }
});

export const cleanStuckTracksJob = cron.schedule("* * * * *", async () => {
  try {
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

    const allTracks = await trackService.getAll();
    const stuckTracks = allTracks.filter(
      (track: ITrack) =>
        (track.status === TrackStatusEnum.Queued ||
          track.status === TrackStatusEnum.Downloading ||
          track.status === TrackStatusEnum.Searching) &&
        track.createdAt &&
        Date.now() - track.createdAt > safeTimeout * 60 * 1000,
    );

    if (stuckTracks.length > 0) {
      console.log(`[ScheduledJob] Found ${stuckTracks.length} stuck tracks, marking as error`);
      for (const track of stuckTracks) {
        if (track.id) {
          await trackService.update(track.id, {
            ...track,
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
    console.error("[ScheduledJob] Error cleaning stuck tracks:", error);
  }
});

export function startScheduledJobs(): void {
  checkPlaylistsJob.start();
  cleanStuckTracksJob.start();
  console.log("✅ Scheduled jobs started (intervals configurable in Settings)");
}
