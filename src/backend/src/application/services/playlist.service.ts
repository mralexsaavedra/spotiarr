import {
  DownloadStatusResponse,
  PlaylistPreview,
  SpotifyPlaylist,
  type IPlaylist,
} from "@spotiarr/shared";
import { CreatePlaylistUseCase } from "../use-cases/playlists/create-playlist.use-case";
import { DeletePlaylistUseCase } from "../use-cases/playlists/delete-playlist.use-case";
import { GetMyPlaylistsUseCase } from "../use-cases/playlists/get-my-playlists.use-case";
import { GetPlaylistPreviewUseCase } from "../use-cases/playlists/get-playlist-preview.use-case";
import { GetPlaylistsUseCase } from "../use-cases/playlists/get-playlists.use-case";
import { GetSystemStatusUseCase } from "../use-cases/playlists/get-system-status.use-case";
import { RetryPlaylistDownloadsUseCase } from "../use-cases/playlists/retry-playlist-downloads.use-case";
import { SyncSubscribedPlaylistsUseCase } from "../use-cases/playlists/sync-subscribed-playlists.use-case";
import { UpdatePlaylistUseCase } from "../use-cases/playlists/update-playlist.use-case";

export interface PlaylistServiceDependencies {
  createPlaylistUseCase: CreatePlaylistUseCase;
  getSystemStatusUseCase: GetSystemStatusUseCase;
  getPlaylistPreviewUseCase: GetPlaylistPreviewUseCase;
  syncSubscribedPlaylistsUseCase: SyncSubscribedPlaylistsUseCase;
  getPlaylistsUseCase: GetPlaylistsUseCase;
  deletePlaylistUseCase: DeletePlaylistUseCase;
  updatePlaylistUseCase: UpdatePlaylistUseCase;
  retryPlaylistDownloadsUseCase: RetryPlaylistDownloadsUseCase;
  getMyPlaylistsUseCase: GetMyPlaylistsUseCase;
}

export class PlaylistService {
  private readonly createPlaylistUseCase: CreatePlaylistUseCase;
  private readonly getSystemStatusUseCase: GetSystemStatusUseCase;
  private readonly getPlaylistPreviewUseCase: GetPlaylistPreviewUseCase;
  private readonly syncSubscribedPlaylistsUseCase: SyncSubscribedPlaylistsUseCase;
  private readonly getPlaylistsUseCase: GetPlaylistsUseCase;
  private readonly deletePlaylistUseCase: DeletePlaylistUseCase;
  private readonly updatePlaylistUseCase: UpdatePlaylistUseCase;
  private readonly retryPlaylistDownloadsUseCase: RetryPlaylistDownloadsUseCase;
  private readonly getMyPlaylistsUseCase: GetMyPlaylistsUseCase;

  constructor(deps: PlaylistServiceDependencies) {
    this.createPlaylistUseCase = deps.createPlaylistUseCase;
    this.getSystemStatusUseCase = deps.getSystemStatusUseCase;
    this.getPlaylistPreviewUseCase = deps.getPlaylistPreviewUseCase;
    this.syncSubscribedPlaylistsUseCase = deps.syncSubscribedPlaylistsUseCase;
    this.getPlaylistsUseCase = deps.getPlaylistsUseCase;
    this.deletePlaylistUseCase = deps.deletePlaylistUseCase;
    this.updatePlaylistUseCase = deps.updatePlaylistUseCase;
    this.retryPlaylistDownloadsUseCase = deps.retryPlaylistDownloadsUseCase;
    this.getMyPlaylistsUseCase = deps.getMyPlaylistsUseCase;
  }

  async findAll(includesTracks = true, where?: Partial<IPlaylist>): Promise<IPlaylist[]> {
    return this.getPlaylistsUseCase.findAll(includesTracks, where);
  }

  async findOne(id: string): Promise<IPlaylist | null> {
    return this.getPlaylistsUseCase.findOne(id);
  }

  async remove(id: string): Promise<void> {
    return this.deletePlaylistUseCase.execute(id);
  }

  async removeCompleted(): Promise<void> {
    return this.deletePlaylistUseCase.removeCompleted();
  }

  async create(playlist: IPlaylist): Promise<IPlaylist> {
    return this.createPlaylistUseCase.execute(playlist);
  }

  async save(playlist: IPlaylist): Promise<IPlaylist> {
    return this.updatePlaylistUseCase.save(playlist);
  }

  async update(id: string, playlist: Partial<IPlaylist>): Promise<void> {
    return this.updatePlaylistUseCase.execute(id, playlist);
  }

  async retryFailedOfPlaylist(id: string): Promise<void> {
    return this.retryPlaylistDownloadsUseCase.execute(id);
  }

  async checkSubscribedPlaylists(): Promise<void> {
    return this.syncSubscribedPlaylistsUseCase.execute();
  }

  async getPreview(spotifyUrl: string): Promise<PlaylistPreview> {
    return this.getPlaylistPreviewUseCase.execute(spotifyUrl);
  }

  async getDownloadStatus(): Promise<DownloadStatusResponse> {
    return this.getSystemStatusUseCase.execute();
  }

  async getMyPlaylists(): Promise<SpotifyPlaylist[]> {
    return this.getMyPlaylistsUseCase.execute();
  }
}
