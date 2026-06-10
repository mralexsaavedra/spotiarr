import type {
  AiPlaylistGenerateJobData,
  AiPlaylistQueueService,
} from "@/domain/services/ai-playlist-queue.service";
import { getAiPlaylistQueue } from "../setup/queues";

export class BullMqAiPlaylistQueueService implements AiPlaylistQueueService {
  async enqueueGenerate(data: AiPlaylistGenerateJobData): Promise<void> {
    await getAiPlaylistQueue().add("generate-ai-playlist", data, {
      jobId: data.jobId,
      attempts: 1,
      removeOnComplete: true,
    });
  }
}
