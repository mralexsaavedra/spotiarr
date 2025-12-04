import {
  DownloadStatusResponse,
  PlaylistPreview,
  TrackStatusEnum,
  type IPlaylist,
} from "@spotiarr/shared";
import { EventBus } from "../../domain/events/event-bus";
import { PlaylistRepository } from "../../domain/repositories/playlist.repository";
import { SpotifyService } from "../../infrastructure/external/spotify.service";
import { AppError } from "../../presentation/middleware/error-handler";
import { CreatePlaylistUseCase } from "../use-cases/playlists/create-playlist.use-case";
import { GetPlaylistPreviewUseCase } from "../use-cases/playlists/get-playlist-preview.use-case";
import { GetSystemStatusUseCase } from "../use-cases/playlists/get-system-status.use-case";
import { SyncSubscribedPlaylistsUseCase } from "../use-cases/playlists/sync-subscribed-playlists.use-case";
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
  }

  async findAll(includesTracks = true, where?: Partial<IPlaylist>): Promise<IPlaylist[]> {
    const playlists = await this.repository.findAll(includesTracks, where);
    return playlists.map((p) => p.toPrimitive());
  }

  async findOne(id: string): Promise<IPlaylist | null> {
    const playlist = await this.repository.findOne(id);
    return playlist ? playlist.toPrimitive() : null;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repository.findOne(id);
    if (!existing) {
      throw new AppError(404, "playlist_not_found");
    }

    await this.repository.delete(id);
    this.eventBus.emit("playlists-updated");
  }

  async removeCompleted(): Promise<void> {
    const playlists = await this.findAll(true);
    const completedPlaylists = playlists.filter((playlist) => {
      if (!playlist.tracks || playlist.tracks.length === 0) return false;
      return playlist.tracks.every((track) => track.status === TrackStatusEnum.Completed);
    });

    for (const playlist of completedPlaylists) {
      await this.repository.delete(playlist.id);
    }

    if (completedPlaylists.length > 0) {
      this.eventBus.emit("playlists-updated");
    }
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
    const savedPlaylist = await this.repository.save(playlist);
    this.eventBus.emit("playlists-updated");
    return savedPlaylist.toPrimitive();
  }

  async update(id: string, playlist: Partial<IPlaylist>): Promise<void> {
    const existing = await this.repository.findOne(id);
    if (!existing) {
      throw new AppError(404, "playlist_not_found");
    }

    await this.repository.update(id, playlist);
    this.eventBus.emit("playlists-updated");
  }

  async retryFailedOfPlaylist(id: string): Promise<void> {
    const playlist = await this.repository.findOne(id);
    if (!playlist) {
      throw new AppError(404, "playlist_not_found");
    }

    const tracks = await this.trackService.getAllByPlaylist(id);
    for (const track of tracks) {
      if (track.status === TrackStatusEnum.Error && track.id) {
        await this.trackService.retry(track.id);
      }
    }
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
