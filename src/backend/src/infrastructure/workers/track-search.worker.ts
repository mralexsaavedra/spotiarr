import { type ITrack } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { container } from "../../container";
import { getEnv } from "../setup/environment";

const { trackService, settingsService } = container;

export async function createTrackSearchWorker() {
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

  worker.on("failed", (job, err) => {
    console.error(`[TrackSearchWorker] Job ${job?.id} failed:`, err);
  });

  console.log(`✅ Track search worker initialized (Concurrency: ${concurrency || 3})`);
  return worker;
}
