import { DownloadStatusResponse, PlaylistPreview, type IPlaylist } from "@spotiarr/shared";
import { EventBus } from "../../domain/events/event-bus";
import { PlaylistRepository } from "../../domain/repositories/playlist.repository";
import { SpotifyService } from "../../infrastructure/external/spotify.service";
import { AppError } from "../../presentation/middleware/error-handler";
import { CreatePlaylistUseCase } from "../use-cases/playlists/create-playlist.use-case";
import { DeletePlaylistUseCase } from "../use-cases/playlists/delete-playlist.use-case";
import { GetPlaylistPreviewUseCase } from "../use-cases/playlists/get-playlist-preview.use-case";
import { GetPlaylistsUseCase } from "../use-cases/playlists/get-playlists.use-case";
import { GetSystemStatusUseCase } from "../use-cases/playlists/get-system-status.use-case";
import { RetryPlaylistDownloadsUseCase } from "../use-cases/playlists/retry-playlist-downloads.use-case";
import { SyncSubscribedPlaylistsUseCase } from "../use-cases/playlists/sync-subscribed-playlists.use-case";
import { UpdatePlaylistUseCase } from "../use-cases/playlists/update-playlist.use-case";
import { SettingsService } from "./settings.service";
import { TrackService } from "./track.service";

export interface PlaylistServiceDependencies {
  repository: PlaylistRepository;
  trackService: TrackService;
  spotifyService: SpotifyService;
  settingsService: SettingsService;
  eventBus: EventBus;
}

export class PlaylistService {
  private readonly repository: PlaylistRepository;
  private readonly trackService: TrackService;
  private readonly createPlaylistUseCase: CreatePlaylistUseCase;
  private readonly getSystemStatusUseCase: GetSystemStatusUseCase;
  private readonly getPlaylistPreviewUseCase: GetPlaylistPreviewUseCase;
  private readonly syncSubscribedPlaylistsUseCase: SyncSubscribedPlaylistsUseCase;
  private readonly getPlaylistsUseCase: GetPlaylistsUseCase;
  private readonly deletePlaylistUseCase: DeletePlaylistUseCase;
  private readonly updatePlaylistUseCase: UpdatePlaylistUseCase;
  private readonly retryPlaylistDownloadsUseCase: RetryPlaylistDownloadsUseCase;
  private readonly eventBus: EventBus;

  constructor(deps: PlaylistServiceDependencies) {
    this.repository = deps.repository;
    this.trackService = deps.trackService;
    this.eventBus = deps.eventBus;

    this.createPlaylistUseCase = new CreatePlaylistUseCase(
      this.repository,
      deps.spotifyService,
      this.trackService,
      deps.settingsService,
    );

    this.getSystemStatusUseCase = new GetSystemStatusUseCase(this.repository);
    this.getPlaylistPreviewUseCase = new GetPlaylistPreviewUseCase(deps.spotifyService);
    this.syncSubscribedPlaylistsUseCase = new SyncSubscribedPlaylistsUseCase(
      this.repository,
      deps.spotifyService,
      this.trackService,
      this.eventBus,
    );
    this.getPlaylistsUseCase = new GetPlaylistsUseCase(this.repository);
    this.deletePlaylistUseCase = new DeletePlaylistUseCase(this.repository, this.eventBus);
    this.updatePlaylistUseCase = new UpdatePlaylistUseCase(this.repository, this.eventBus);
    this.retryPlaylistDownloadsUseCase = new RetryPlaylistDownloadsUseCase(
      this.repository,
      this.trackService,
    );
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
    const existing = await this.repository.findAll(false, { spotifyUrl: playlist.spotifyUrl });
    if (existing.length > 0) {
      throw new AppError(409, "playlist_already_exists");
    }

    const created = await this.createPlaylistUseCase.execute(playlist);
    this.eventBus.emit("playlists-updated");
    return created;
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
}
