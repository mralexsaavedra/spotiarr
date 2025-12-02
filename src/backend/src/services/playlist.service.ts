import { PlaylistPreview, TrackStatusEnum, type IPlaylist } from "@spotiarr/shared";
import { EventBus } from "../domain/events/event-bus";
import { PlaylistRepository } from "../domain/interfaces/playlist.repository";
import { CreatePlaylistUseCase } from "../domain/playlists/create-playlist.use-case";
import { SpotifyUrlHelper, SpotifyUrlType } from "../helpers/spotify-url.helper";
import { AppError } from "../middleware/error-handler";
import { SettingsService } from "./settings.service";
import { SpotifyService, type PlaylistTrack } from "./spotify.service";
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
  private readonly spotifyService: SpotifyService;
  private readonly createPlaylistUseCase: CreatePlaylistUseCase;
  private readonly eventBus: EventBus;

  constructor(deps: PlaylistServiceDependencies) {
    this.repository = deps.repository;
    this.trackService = deps.trackService;
    this.spotifyService = deps.spotifyService;
    this.eventBus = deps.eventBus;

    this.createPlaylistUseCase = new CreatePlaylistUseCase(
      this.repository,
      this.spotifyService,
      this.trackService,
      deps.settingsService,
    );
  }

  findAll(includesTracks = true, where?: Partial<IPlaylist>): Promise<IPlaylist[]> {
    return this.repository.findAll(includesTracks, where);
  }

  findOne(id: string): Promise<IPlaylist | null> {
    return this.repository.findOne(id);
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
    return savedPlaylist;
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
    const subscribedPlaylists = await this.findAll(false, { subscribed: true });
    for (const playlist of subscribedPlaylists) {
      let tracks: PlaylistTrack[] = [];
      try {
        tracks = await this.spotifyService.getPlaylistTracks(playlist.spotifyUrl);
      } catch (error) {
        // Mirror the previous behaviour of marking the playlist with an error.
        await this.update(playlist.id, {
          ...playlist,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      const urlType = SpotifyUrlHelper.getUrlType(playlist.spotifyUrl);
      const isTrack = urlType === SpotifyUrlType.Track;
      const isAlbum = urlType === SpotifyUrlType.Album;

      for (let i = 0; i < (tracks ?? []).length; i++) {
        const track = tracks[i];

        const artistToUse =
          (isAlbum || isTrack) && track.primaryArtist ? track.primaryArtist : track.artist;

        const track2Save = {
          artist: artistToUse,
          name: track.name,
          album: track.album ?? (isTrack ? "Singles" : playlist.name),
          albumYear: track.albumYear,
          trackNumber: track.trackNumber ?? i + 1,
          spotifyUrl: track.previewUrl ?? undefined,
          artists: track.artists,
          trackUrl: track.trackUrl,
        };

        const isExist = !!(
          await this.trackService.getAll({
            artist: track2Save.artist,
            name: track2Save.name,
            spotifyUrl: track2Save.spotifyUrl ?? undefined,
            playlistId: playlist.id,
          })
        ).length;

        if (!isExist) {
          await this.trackService.create({ ...track2Save, playlistId: playlist.id });
        }
      }
    }
  }

  async getPreview(spotifyUrl: string): Promise<PlaylistPreview> {
    const details = await this.spotifyService.getPlaylistDetail(spotifyUrl);

    return {
      name: details.name,
      type: details.type,
      description: null,
      coverUrl: details.image || null,
      tracks: details.tracks.map((track) => ({
        name: track.name,
        artists: track.artists?.map((a) => ({ name: a.name, url: a.url })) || [
          { name: track.artist, url: undefined },
        ],
        album: track.album || "Unknown Album",
        duration: track.durationMs || 0,
        trackUrl: track.trackUrl,
        albumUrl: track.albumUrl,
      })),
      totalTracks: details.tracks.length,
    };
  }
}
