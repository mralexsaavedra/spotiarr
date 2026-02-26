import { Request, Response } from "express";
import { CreatePlaylistUseCase } from "@/application/use-cases/playlists/create-playlist.use-case";
import { DeletePlaylistUseCase } from "@/application/use-cases/playlists/delete-playlist.use-case";
import { GetMyPlaylistsUseCase } from "@/application/use-cases/playlists/get-my-playlists.use-case";
import { GetPlaylistPreviewUseCase } from "@/application/use-cases/playlists/get-playlist-preview.use-case";
import { GetPlaylistsUseCase } from "@/application/use-cases/playlists/get-playlists.use-case";
import { GetSystemStatusUseCase } from "@/application/use-cases/playlists/get-system-status.use-case";
import { RetryPlaylistDownloadsUseCase } from "@/application/use-cases/playlists/retry-playlist-downloads.use-case";
import { UpdatePlaylistUseCase } from "@/application/use-cases/playlists/update-playlist.use-case";

export class PlaylistController {
  constructor(
    private readonly createPlaylistUseCase: CreatePlaylistUseCase,
    private readonly deletePlaylistUseCase: DeletePlaylistUseCase,
    private readonly getMyPlaylistsUseCase: GetMyPlaylistsUseCase,
    private readonly getPlaylistPreviewUseCase: GetPlaylistPreviewUseCase,
    private readonly getPlaylistsUseCase: GetPlaylistsUseCase,
    private readonly getSystemStatusUseCase: GetSystemStatusUseCase,
    private readonly retryPlaylistDownloadsUseCase: RetryPlaylistDownloadsUseCase,
    private readonly updatePlaylistUseCase: UpdatePlaylistUseCase,
  ) {}

  getPreview = async (req: Request, res: Response) => {
    const { url } = req.query as { url: string };
    const preview = await this.getPlaylistPreviewUseCase.execute(url);
    res.json(preview);
  };

  getMyPlaylists = async (req: Request, res: Response) => {
    const playlists = await this.getMyPlaylistsUseCase.execute();
    res.json(playlists);
  };

  getDownloadStatus = async (req: Request, res: Response) => {
    const status = await this.getSystemStatusUseCase.execute();
    res.json(status);
  };

  findAll = async (req: Request, res: Response) => {
    const playlists = await this.getPlaylistsUseCase.findAll();
    res.json({ data: playlists });
  };

  create = async (req: Request, res: Response) => {
    const playlist = await this.createPlaylistUseCase.execute(req.body);
    res.status(201).json(playlist);
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.updatePlaylistUseCase.execute(id, req.body);
    res.status(204).send();
  };

  removeCompleted = async (req: Request, res: Response) => {
    await this.deletePlaylistUseCase.removeCompleted();
    res.status(204).send();
  };

  remove = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.deletePlaylistUseCase.execute(id);
    res.status(204).send();
  };

  retryFailedOfPlaylist = async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.retryPlaylistDownloadsUseCase.execute(id);
    res.status(204).send();
  };
}
