import { Request, Response } from "express";
import { DeleteTrackUseCase } from "@/application/use-cases/tracks/delete-track.use-case";
import { GetTracksUseCase } from "@/application/use-cases/tracks/get-tracks.use-case";
import { RetryTrackDownloadUseCase } from "@/application/use-cases/tracks/retry-track-download.use-case";

export class TrackController {
  constructor(
    private readonly deleteTrackUseCase: DeleteTrackUseCase,
    private readonly getTracksUseCase: GetTracksUseCase,
    private readonly retryTrackDownloadUseCase: RetryTrackDownloadUseCase,
  ) {}

  getAllByPlaylist = async (req: Request, res: Response) => {
    const playlistId = req.params.id;
    const tracks = await this.getTracksUseCase.getAllByPlaylist(playlistId);
    res.json({ data: tracks });
  };

  remove = async (req: Request, res: Response) => {
    const id = req.params.id;
    await this.deleteTrackUseCase.execute(id);
    res.status(204).send();
  };

  retry = async (req: Request, res: Response) => {
    const id = req.params.id;
    await this.retryTrackDownloadUseCase.execute(id);
    res.status(204).send();
  };
}
