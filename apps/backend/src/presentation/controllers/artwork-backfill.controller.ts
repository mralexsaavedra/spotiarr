import type { Request, Response } from "express";
import { GetArtworkBackfillStatusUseCase } from "@/application/use-cases/artwork-backfill/get-artwork-backfill-status.use-case";
import { PauseArtworkBackfillUseCase } from "@/application/use-cases/artwork-backfill/pause-artwork-backfill.use-case";
import { ResumeArtworkBackfillUseCase } from "@/application/use-cases/artwork-backfill/resume-artwork-backfill.use-case";
import { StartArtworkBackfillUseCase } from "@/application/use-cases/artwork-backfill/start-artwork-backfill.use-case";

export class ArtworkBackfillController {
  constructor(
    private readonly startUseCase: StartArtworkBackfillUseCase,
    private readonly pauseUseCase: PauseArtworkBackfillUseCase,
    private readonly resumeUseCase: ResumeArtworkBackfillUseCase,
    private readonly getStatusUseCase: GetArtworkBackfillStatusUseCase,
  ) {}

  start = async (_req: Request, res: Response) => {
    const data = await this.startUseCase.execute();
    res.status(202).json({ data });
  };

  pause = async (_req: Request, res: Response) => {
    const data = await this.pauseUseCase.execute();
    res.status(202).json({ data });
  };

  resume = async (_req: Request, res: Response) => {
    const data = await this.resumeUseCase.execute();
    res.status(202).json({ data });
  };

  status = async (_req: Request, res: Response) => {
    const data = await this.getStatusUseCase.execute();
    res.json({ data });
  };
}
