import type { Request, Response } from "express";
import type { AiPlaylistQueueService } from "@/domain/services/ai-playlist-queue.service";

export class AiChatController {
  constructor(private readonly aiPlaylistQueueService: AiPlaylistQueueService) {}

  generate = async (req: Request, res: Response) => {
    const { prompt } = req.body as { prompt: string };
    const jobId = crypto.randomUUID();

    await this.aiPlaylistQueueService.enqueueGenerate({ jobId, prompt });

    res.status(202).json({ data: { jobId } });
  };
}
