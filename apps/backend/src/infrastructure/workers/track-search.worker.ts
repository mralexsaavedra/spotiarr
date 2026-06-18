import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { getContainer } from "../../container";
import { logger } from "../logging/logger";
import { getEnv } from "../setup/environment";

const log = logger.child({ worker: "track-search-worker" });

export async function createTrackSearchWorker() {
  const { trackService, settingsService, eventsController } = getContainer();
  const concurrency = await settingsService.getNumber("YT_SEARCH_CONCURRENCY");

  const worker = new Worker(
    "track-search-processor",
    async (job) => {
      const track: ITrack = job.data;
      await trackService.findOnYoutube(track);
    },
    {
      concurrency: concurrency || 3, // Default to 3 if setting missing
      connection: {
        host: getEnv().REDIS_HOST,
        port: getEnv().REDIS_PORT,
      },
    },
  );

  worker.on("completed", (job) => {
    log.info({ jobId: job.id }, "Job completed");
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
          searchAttempts: (track.searchAttempts ?? 0) + 1,
        });
        eventsController.emit("playlists-updated");
      } catch (updateError) {
        log.error({ trackId, err: updateError }, "Failed to update track status after job failure");
      }
    }
  });

  log.info({ concurrency: concurrency || 3 }, "Track search worker initialized");
  return worker;
}
