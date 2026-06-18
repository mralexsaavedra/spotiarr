import { Request, Response } from "express";
import { HistoryUseCases } from "@/application/use-cases/history/history.use-cases";
import type { RecordPlayBody } from "@/presentation/routes/schemas/history.schema";

export class HistoryController {
  constructor(private readonly historyUseCases: HistoryUseCases) {}

  getRecentDownloads = async (_req: Request, res: Response) => {
    const items = await this.historyUseCases.getRecentDownloads();
    res.json({ data: items });
  };

  getRecentTracks = async (_req: Request, res: Response) => {
    const items = await this.historyUseCases.getRecentTracks();
    res.json({ data: items });
  };

  recordPlay = async (req: Request<object, object, RecordPlayBody>, res: Response) => {
    await this.historyUseCases.recordPlay(req.body);
    res.status(201).json({ data: null });
  };
}
