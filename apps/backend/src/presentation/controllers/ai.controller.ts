import type { Request, Response } from "express";
import type { AiPlaylistQueueService } from "@/domain/services/ai-playlist-queue.service";

type ListModelsFn = () => Promise<string[]>;

export class AiChatController {
  constructor(
    private readonly aiPlaylistQueueService: AiPlaylistQueueService,
    private readonly listModelsFn?: ListModelsFn,
  ) {}

  generate = async (req: Request, res: Response) => {
    const { prompt } = req.body as { prompt: string };
    const jobId = crypto.randomUUID();

    await this.aiPlaylistQueueService.enqueueGenerate({ jobId, prompt });

    res.status(202).json({ data: { jobId } });
  };

  listModels = async (req: Request, res: Response) => {
    const models = await this.listModelsFn!();
    res.status(200).json({ data: { models } });
  };
}
