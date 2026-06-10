import type { AiPlaylistProgressEvent } from "@spotiarr/shared";
import { Worker } from "bullmq";
import { GenerateAiPlaylistUseCase } from "@/application/use-cases/ai/generate-ai-playlist.use-case";
import { getContainer } from "@/container";
import { createAiChatPort } from "../external/providers/ai/openai-compatible.adapter";
import { getEnv } from "../setup/environment";
import { AI_PLAYLIST_QUEUE } from "../setup/queues";

export function createAiPlaylistWorker(): Worker {
  const { spotifyUrlLookupClient, playlistRepository, trackService, eventBus, settingsService } =
    getContainer();

  const worker = new Worker(
    AI_PLAYLIST_QUEUE,
    async (job) => {
      const { jobId, prompt } = job.data as { jobId: string; prompt: string };

      const onProgress = (event: AiPlaylistProgressEvent) => {
        eventBus.emit("ai-playlist-progress", event);
      };

      const aiChatPort = createAiChatPort(settingsService);

      const useCase = new GenerateAiPlaylistUseCase({
        aiChatPort,
        resolveTrackUrl: (title, artist) => spotifyUrlLookupClient.resolveTrackUrl(title, artist),
        playlistRepository,
        trackService,
        eventBus,
        onProgress,
      });

      await useCase.execute({ jobId, prompt });
    },
    {
      connection: {
        host: getEnv().REDIS_HOST,
        port: getEnv().REDIS_PORT,
      },
      concurrency: 1,
      lockDuration: 10 * 60_000,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[AiPlaylistWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[AiPlaylistWorker] Job ${job?.id} failed`, error);
  });

  console.log("✅ AI playlist worker initialized");
  return worker;
}
