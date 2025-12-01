import { TrackStatusEnum, type IPlaylist } from "@spotiarr/shared";
import { SpotifyUrlHelper, SpotifyUrlType } from "../../helpers/spotify-url.helper";
import { AppError } from "../../middleware/error-handler";
import type { PlaylistTrack, SpotifyService } from "../../services/spotify.service";
import type { TrackService } from "../../services/track.service";
import type { CreatePlaylistUseCase } from "./create-playlist.use-case";
import type { PlaylistRepository } from "./playlist.repository";

export type PlaylistEvent = "playlists-updated";

export type PlaylistEventEmitter = (event: PlaylistEvent) => void;

export interface PlaylistUseCaseDependencies {
  repository: PlaylistRepository;
  trackService: TrackService;
  spotifyService: SpotifyService;
  createPlaylistUseCase: CreatePlaylistUseCase;
  emitEvent: PlaylistEventEmitter;
}

export class PlaylistUseCases {
  constructor(private readonly deps: PlaylistUseCaseDependencies) {}

  findAll(includesTracks = true, where?: Partial<IPlaylist>): Promise<IPlaylist[]> {
    return this.deps.repository.findAll(includesTracks, where);
  }

  findOne(id: string): Promise<IPlaylist | null> {
    return this.deps.repository.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.deps.repository.findOne(id);
    if (!existing) {
      throw new AppError(404, "playlist_not_found");
    }

    await this.deps.repository.delete(id);
    this.deps.emitEvent("playlists-updated");
  }

  async removeCompleted(): Promise<void> {
    const playlists = await this.findAll(true);
    const completedPlaylists = playlists.filter((playlist) => {
      if (!playlist.tracks || playlist.tracks.length === 0) return false;
      return playlist.tracks.every((track) => track.status === TrackStatusEnum.Completed);
    });

    for (const playlist of completedPlaylists) {
      await this.deps.repository.delete(playlist.id);
    }

    if (completedPlaylists.length > 0) {
      this.deps.emitEvent("playlists-updated");
    }
  }

  async create(playlist: IPlaylist): Promise<IPlaylist> {
    const existing = await this.deps.repository.findAll(false, { spotifyUrl: playlist.spotifyUrl });
    if (existing.length > 0) {
      throw new AppError(409, "playlist_already_exists");
    }

    const created = await this.deps.createPlaylistUseCase.execute(playlist);
    this.deps.emitEvent("playlists-updated");
    return created;
  }

  async save(playlist: IPlaylist): Promise<IPlaylist> {
    const savedPlaylist = await this.deps.repository.save(playlist);
    this.deps.emitEvent("playlists-updated");
    return savedPlaylist;
  }

  async update(id: string, playlist: Partial<IPlaylist>): Promise<void> {
    const existing = await this.deps.repository.findOne(id);
    if (!existing) {
      throw new AppError(404, "playlist_not_found");
    }

    await this.deps.repository.update(id, playlist);
    this.deps.emitEvent("playlists-updated");
  }

  async retryFailedOfPlaylist(id: string): Promise<void> {
    const playlist = await this.deps.repository.findOne(id);
    if (!playlist) {
      throw new AppError(404, "playlist_not_found");
    }

    const tracks = await this.deps.trackService.getAllByPlaylist(id);
    for (const track of tracks) {
      if (track.status === TrackStatusEnum.Error && track.id) {
        await this.deps.trackService.retry(track.id);
      }
    }
  }

  async checkSubscribedPlaylists(): Promise<void> {
    const subscribedPlaylists = await this.findAll(false, { subscribed: true });
    for (const playlist of subscribedPlaylists) {
      let tracks: PlaylistTrack[] = [];
      try {
        tracks = await this.deps.spotifyService.getPlaylistTracks(playlist.spotifyUrl);
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
          await this.deps.trackService.getAll({
            artist: track2Save.artist,
            name: track2Save.name,
            spotifyUrl: track2Save.spotifyUrl ?? undefined,
            playlistId: playlist.id,
          })
        ).length;

        if (!isExist) {
          await this.deps.trackService.create({ ...track2Save, playlistId: playlist.id });
        }
      }
    }
  }
}
