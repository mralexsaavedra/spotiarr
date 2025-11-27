import { PlaylistPreview } from "@spotiarr/shared";
import { CreatePlaylistUseCase } from "../domain/playlists/create-playlist.use-case";
import { PlaylistUseCases } from "../domain/playlists/playlist.use-cases";
import { PlaylistEntity } from "../entities/playlist.entity";
import { PlaylistRepository } from "../repositories/playlist.repository";
import { emitSseEvent } from "../routes/events.routes";
import { SettingsService } from "./settings.service";
import { SpotifyApiService } from "./spotify-api.service";
import { SpotifyService } from "./spotify.service";
import { TrackService } from "./track.service";

export class PlaylistService {
  private readonly useCases: PlaylistUseCases;
  private readonly spotifyService: SpotifyService;

  constructor() {
    const repository = new PlaylistRepository();
    const trackService = new TrackService();
    const spotifyApiService = new SpotifyApiService();
    const settingsService = new SettingsService();
    this.spotifyService = new SpotifyService(spotifyApiService);

    this.useCases = new PlaylistUseCases({
      repository,
      trackService,
      spotifyService: this.spotifyService,
      createPlaylistUseCase: new CreatePlaylistUseCase(
        repository,
        this.spotifyService,
        trackService,
        settingsService,
      ),
      emitEvent: emitSseEvent,
    });
  }

  findAll(
    relations: Record<string, boolean> = { tracks: true },
    where?: Partial<PlaylistEntity>,
  ): Promise<PlaylistEntity[]> {
    return this.useCases.findAll(relations, where);
  }

  findOne(id: string): Promise<PlaylistEntity | null> {
    return this.useCases.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.useCases.remove(id);
  }

  async create(playlist: PlaylistEntity): Promise<PlaylistEntity> {
    return this.useCases.create(playlist);
  }

  async save(playlist: PlaylistEntity): Promise<PlaylistEntity> {
    return this.useCases.save(playlist);
  }

  async update(id: string, playlist: Partial<PlaylistEntity>): Promise<void> {
    await this.useCases.update(id, playlist);
  }

  async retryFailedOfPlaylist(id: string): Promise<void> {
    await this.useCases.retryFailedOfPlaylist(id);
  }

  async checkSubscribedPlaylists(): Promise<void> {
    await this.useCases.checkSubscribedPlaylists();
  }

  async getPreview(spotifyUrl: string): Promise<PlaylistPreview> {
    const details = await this.spotifyService.getPlaylistDetail(spotifyUrl);

    return {
      name: details.name,
      description: null,
      coverUrl: details.image || null,
      tracks: details.tracks.map((track) => ({
        name: track.name,
        artists: track.artists?.map((a) => a.name) || [track.artist],
        album: track.album || "Unknown Album",
        duration: 0, // Duration not available in preview
      })),
      totalTracks: details.tracks.length,
    };
  }
}
