import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { getContainer } from "../../container";
import { getEnv } from "../setup/environment";

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
    console.log(`[TrackSearchWorker] Job ${job.id} completed`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[TrackSearchWorker] Job ${job?.id} failed:`, err);

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
          searchAttempts: (track.searchAttempts ?? 0) + 1,
        });
        eventsController.emit("playlists-updated");
      } catch (updateError) {
        console.error(`Failed to update track ${trackId} status after job failure:`, updateError);
      }
    }
  });

  console.log(`✅ Track search worker initialized (Concurrency: ${concurrency || 3})`);
  return worker;
}
