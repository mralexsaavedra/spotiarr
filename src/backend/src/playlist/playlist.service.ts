import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PlaylistEntity } from './playlist.entity';
import { TrackService } from '../track/track.service';
import { Interval } from '@nestjs/schedule';
import { TrackStatusEnum } from '../track/track.entity';
import { SpotifyService } from '../shared/spotify.service';
import { SpotifyUrlHelper, SpotifyUrlType } from '../shared/spotify-url.helper';
import { PlaylistGateway } from './playlist.gateway';
import { PlaylistRepository } from './playlist.repository';
import { CreatePlaylistUseCase } from './use-cases/create-playlist.use-case';

@Injectable()
export class PlaylistService {
  private readonly logger = new Logger(PlaylistService.name);

  constructor(
    private readonly repository: PlaylistRepository,
    private readonly trackService: TrackService,
    private readonly spotifyService: SpotifyService,
    private readonly playlistGateway: PlaylistGateway,
    private readonly createPlaylistUseCase: CreatePlaylistUseCase,
  ) {}

  findAll(
    relations: Record<string, boolean> = { tracks: true },
    where?: Partial<PlaylistEntity>,
  ): Promise<PlaylistEntity[]> {
    return this.repository.findAll(relations, where);
  }

  findOne(id: number): Promise<PlaylistEntity | null> {
    return this.repository.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
    this.playlistGateway.emitDelete(id);
  }

  async create(playlist: PlaylistEntity): Promise<void> {
    return this.createPlaylistUseCase.execute(playlist);
  }

  async save(playlist: PlaylistEntity): Promise<PlaylistEntity> {
    const savedPlaylist = await this.repository.save(playlist);
    this.playlistGateway.emitNew(savedPlaylist);
    return savedPlaylist;
  }

  async update(id: number, playlist: Partial<PlaylistEntity>): Promise<void> {
    await this.repository.update(id, playlist);
    const dbPlaylist = await this.findOne(id);
    this.playlistGateway.emitUpdate(dbPlaylist);
  }

  async retryFailedOfPlaylist(id: number): Promise<void> {
    const tracks = await this.trackService.getAllByPlaylist(id);
    for (const track of tracks) {
      if (track.status === TrackStatusEnum.Error) {
        await this.trackService.retry(track.id);
      }
    }
  }

  @Interval(3_600_000)
  async checkActivePlaylists(): Promise<void> {
    const activePlaylists = await this.findAll({}, { active: true });
    for (const playlist of activePlaylists) {
      let tracks = [];
      try {
        tracks = await this.spotifyService.getPlaylistTracks(
          playlist.spotifyUrl,
        );
      } catch (error) {
        this.logger.error(
          `Error checking active playlist: ${playlist.name}`,
          error instanceof Error ? error.stack : String(error),
        );
        await this.update(playlist.id, {
          ...playlist,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Detect if it's a playlist, album, or individual track
      const urlType = SpotifyUrlHelper.getUrlType(playlist.spotifyUrl);
      const isTrack = urlType === SpotifyUrlType.Track;
      const isAlbum = urlType === SpotifyUrlType.Album;

      for (let i = 0; i < (tracks ?? []).length; i++) {
        const track = tracks[i];

        // For albums/tracks: use primaryArtist from Spotify if available
        // For playlists: use the full artist string
        const artistToUse =
          (isAlbum || isTrack) && track.primaryArtist
            ? track.primaryArtist
            : track.artist;

        const track2Save = {
          artist: artistToUse,
          name: track.name,
          album: track.album ?? (isTrack ? 'Singles' : playlist.name),
          albumYear: track.albumYear,
          trackNumber: track.trackNumber ?? i + 1,
          spotifyUrl: track.previewUrl,
          artists: track.artists,
          trackUrl: track.trackUrl,
        };
        const isExist = !!(
          await this.trackService.getAll({
            artist: track2Save.artist,
            name: track2Save.name,
            spotifyUrl: track2Save.spotifyUrl,
            playlist: { id: playlist.id },
          })
        ).length;
        if (!isExist) {
          await this.trackService.create(track2Save, playlist);
        }
      }
    }
  }
}
