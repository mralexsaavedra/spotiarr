import type { ListeningScope } from "@spotiarr/shared";
import type { Request, Response } from "express";
import type { ClearChatMessagesUseCase } from "@/application/use-cases/ai/clear-chat-messages.use-case";
import type { GetChatMessagesUseCase } from "@/application/use-cases/ai/get-chat-messages.use-case";
import { buildListeningContext } from "@/application/use-cases/history/build-listening-context.use-case";
import type { HistoryUseCases } from "@/application/use-cases/history/history.use-cases";
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
    private readonly listModelsFn: ListModelsFn | undefined,
    private readonly getChatMessagesUseCase: GetChatMessagesUseCase,
    private readonly clearChatMessagesUseCase: ClearChatMessagesUseCase,
    private readonly historyUseCases?: Pick<HistoryUseCases, "getTopTracks" | "getTopArtists">,
  ) {}

  generate = async (req: Request, res: Response) => {
    const { prompt, listeningIntent } = req.body as {
      prompt: string;
      listeningIntent?: ListeningScope;
    };
    const jobId = crypto.randomUUID();

    let listeningContext: string | undefined;

    if (listeningIntent && this.historyUseCases) {
      const [topTracks, topArtists] = await Promise.all([
        listeningIntent !== "artists" ? this.historyUseCases.getTopTracks(15) : Promise.resolve([]),
        listeningIntent !== "tracks" ? this.historyUseCases.getTopArtists(15) : Promise.resolve([]),
      ]);
      const ctx = buildListeningContext(topTracks, topArtists, listeningIntent);
      listeningContext = ctx || undefined;
    }

    await this.aiPlaylistQueueService.enqueueGenerate({ jobId, prompt, listeningContext });

    res.status(202).json({ data: { jobId } });
  };

  listModels = async (req: Request, res: Response) => {
    const { provider, baseURL, apiKey } = (req.body ?? {}) as ModelOverrides;
    const overrides: ModelOverrides = { provider, baseURL, apiKey };
    const models = await this.listModelsFn!(overrides);
    res.status(200).json({ data: { models } });
  };

  getMessages = async (_req: Request, res: Response) => {
    const messages = await this.getChatMessagesUseCase.execute();
    res.status(200).json({ data: { messages } });
  };

  clearMessages = async (_req: Request, res: Response) => {
    const result = await this.clearChatMessagesUseCase.execute();
    res.status(200).json({ data: { deleted: result.deleted } });
  };
}
