import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { PrismaTrackRepository } from "../repositories/prisma-track.repository";
import { emitSseEvent } from "../routes/events.routes";
import { SettingsService } from "../services/settings.service";
import { TrackService } from "../services/track.service";
import { getEnv } from "../setup/environment";

const trackService = new TrackService();
const settingsService = new SettingsService();
const trackRepository = new PrismaTrackRepository();

export const trackDownloadWorker = new Worker(
  "track-download-processor",
  async (job) => {
    const track: ITrack = job.data;
    const maxPerMinute = await settingsService.getNumber("YT_DOWNLOADS_PER_MINUTE");
    const sleepMs = Math.floor(60000 / maxPerMinute);

    await new Promise((resolve) => setTimeout(resolve, sleepMs));
    await trackService.downloadFromYoutube(track);
  },
  {
    connection: {
      host: getEnv().REDIS_HOST,
      port: getEnv().REDIS_PORT,
    },
  },
);

trackDownloadWorker.on("completed", (job) => {
  console.log(`[TrackDownloadWorker] Job ${job.id} completed`);
});

trackDownloadWorker.on("failed", async (job, err) => {
  console.error(`[TrackDownloadWorker] Job ${job?.id} failed:`, err);

  if (job?.data?.id) {
    const track: ITrack = job.data;
    const trackId = track.id;

    if (!trackId) {
      console.error("Cannot update track status: track.id is undefined");
      return;
    }

    try {
      await trackRepository.update(trackId, {
        ...track,
        status: TrackStatusEnum.Error,
        error: err instanceof Error ? err.message : String(err),
      });
      emitSseEvent("playlists-updated");
    } catch (updateError) {
      console.error(`Failed to update track ${trackId} status after job failure:`, updateError);
    }
  }
});

console.log("✅ Track download worker initialized");
