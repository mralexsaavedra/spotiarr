import { type ITrack } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { container } from "../../container";
import { getEnv } from "../setup/environment";

const { trackService, settingsService } = container;

export const trackSearchWorker = new Worker(
  "track-search-processor",
  async (job) => {
    const track: ITrack = job.data;
    await trackService.findOnYoutube(track);
  },
  {
    concurrency: 3,
    connection: {
      host: getEnv().REDIS_HOST,
      port: getEnv().REDIS_PORT,
    },
  },
);

settingsService.getNumber("YT_SEARCH_CONCURRENCY").then((concurrency) => {
  trackSearchWorker.concurrency = concurrency;
  console.log(`✅ Track search worker concurrency set to ${concurrency}`);
});

trackSearchWorker.on("completed", (job) => {
  console.log(`[TrackSearchWorker] Job ${job.id} completed`);
});

trackSearchWorker.on("failed", (job, err) => {
  console.error(`[TrackSearchWorker] Job ${job?.id} failed:`, err);
});

console.log("✅ Track search worker initialized");
