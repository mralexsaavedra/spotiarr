import type { Request, Response } from "express";
import type { AiPlaylistQueueService } from "@/domain/services/ai-playlist-queue.service";

interface ModelOverrides {
  provider?: string;
  baseURL?: string;
  apiKey?: string;
}

type ListModelsFn = (overrides: ModelOverrides) => Promise<string[]>;

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
    const { provider, baseURL, apiKey } = (req.body ?? {}) as ModelOverrides;
    const overrides: ModelOverrides = { provider, baseURL, apiKey };
    const models = await this.listModelsFn!(overrides);
    res.status(200).json({ data: { models } });
  };
}
