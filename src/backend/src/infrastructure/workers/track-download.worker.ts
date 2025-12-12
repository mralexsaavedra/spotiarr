import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { emitSseEvent } from "@/presentation/routes/events.routes";
import { container } from "../../container";
import { getEnv } from "../setup/environment";

const { trackService, settingsService } = container;

export async function createTrackDownloadWorker() {
  const maxPerMinute = await settingsService.getNumber("YT_DOWNLOADS_PER_MINUTE");

  const worker = new Worker(
    "track-download-processor",
    async (job) => {
      const track: ITrack = job.data;
      // Rate limit is handled natively by BullMQ now using the limiter option below
      await trackService.downloadFromYoutube(track);
    },
    {
      connection: {
        host: getEnv().REDIS_HOST,
        port: getEnv().REDIS_PORT,
      },
      limiter: {
        max: maxPerMinute || 10, // Fallback to 10 if setting is missing/0
        duration: 60000, // 1 minute
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[TrackDownloadWorker] Job ${job.id} completed`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[TrackDownloadWorker] Job ${job?.id} failed:`, err);

    if (job?.data?.id) {
      const track: ITrack = job.data;
      const trackId = track.id;

      if (!trackId) {
        console.error("Cannot update track status: track.id is undefined");
        return;
      }

      try {
        await trackService.update(trackId, {
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

  console.log(`✅ Track download worker initialized (Rate limit: ${maxPerMinute}/min)`);
  return worker;
}
