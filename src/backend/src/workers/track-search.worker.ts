import { Worker } from "bullmq";
import { TrackEntity } from "../entities/track.entity";
import { SettingsService } from "../services/settings.service";
import { TrackService } from "../services/track.service";
import { EnvironmentEnum } from "../setup/environment";

const trackService = new TrackService();
const settingsService = new SettingsService();

export const trackSearchWorker = new Worker(
  "track-search-processor",
  async (job) => {
    const track: TrackEntity = job.data;
    await trackService.findOnYoutube(track);
  },
  {
    concurrency: 3,
    connection: {
      host: process.env[EnvironmentEnum.REDIS_HOST] || "localhost",
      port: parseInt(process.env[EnvironmentEnum.REDIS_PORT] || "6379"),
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
