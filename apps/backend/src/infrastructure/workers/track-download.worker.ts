import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { getContainer } from "../../container";
import { logger } from "../logging/logger";
import { getEnv } from "../setup/environment";

const log = logger.child({ worker: "track-download-worker" });

export async function createTrackDownloadWorker() {
  const { trackService, settingsService, libraryService, eventsController } = getContainer();
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
    log.info({ jobId: job.id }, "Job completed");
  });

  worker.on("drained", async () => {
    log.info("Queue drained, triggering library scan...");
    try {
      await libraryService.scan();
      eventsController.emit("library-updated");
      log.info("Library scan completed successfully.");
    } catch (err) {
      log.error({ err }, "Failed to scan library after queue drain");
    }
  });

  worker.on("failed", async (job, err) => {
    log.error({ jobId: job?.id, err }, "Job failed");

    if (job?.data?.id) {
      const track: ITrack = job.data;
      const trackId = track.id;

      if (!trackId) {
        log.error("Cannot update track status: track.id is undefined");
        return;
      }

      try {
        await trackService.update(trackId, {
          ...track,
          status: TrackStatusEnum.Error,
          error: err instanceof Error ? err.message : String(err),
        });
        eventsController.emit("playlists-updated");
      } catch (updateError) {
        log.error({ trackId, err: updateError }, "Failed to update track status after job failure");
      }
    }
  });

  log.info({ rateLimit: maxPerMinute || 10 }, "Track download worker initialized");
  return worker;
}
