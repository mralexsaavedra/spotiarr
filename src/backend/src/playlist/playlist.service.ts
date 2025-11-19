import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaylistEntity } from './playlist.entity';
import { TrackService } from '../track/track.service';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Interval } from '@nestjs/schedule';
import { TrackStatusEnum } from '../track/track.entity';
import { UtilsService } from '../shared/utils.service';
import { SpotifyService } from '../shared/spotify.service';

enum WsPlaylistOperation {
  New = 'playlistNew',
  Update = 'playlistUpdate',
  Delete = 'playlistDelete',
}

@WebSocketGateway()
@Injectable()
export class PlaylistService {
  @WebSocketServer() io: Server;
  private readonly logger = new Logger(TrackService.name);

  constructor(
    @InjectRepository(PlaylistEntity)
    private repository: Repository<PlaylistEntity>,
    private readonly trackService: TrackService,
    private readonly utilsService: UtilsService,
    private readonly spotifyService: SpotifyService,
  ) {}

  findAll(
    relations: Record<string, boolean> = { tracks: true },
    where?: Partial<PlaylistEntity>,
  ): Promise<PlaylistEntity[]> {
    return this.repository.find({ where, relations });
  }

  findOne(id: number): Promise<PlaylistEntity | null> {
    return this.repository.findOneBy({ id });
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
    this.io.emit(WsPlaylistOperation.Delete, { id });
  }

  async create(playlist: PlaylistEntity): Promise<void> {
    let detail: { tracks: any; name: any; image: any; type: any };
    let playlist2Save: PlaylistEntity;
    try {
      detail = await this.spotifyService.getPlaylistDetail(playlist.spotifyUrl);
      this.logger.debug(
        `Playlist detail retrieved with ${detail.tracks?.length || 0} tracks`,
      );

      // For tracks and albums, format name as "Artist - Title"
      let displayName = detail.name;
      if (
        (detail.type === 'track' || detail.type === 'album') &&
        detail.tracks?.length > 0
      ) {
        const firstTrack = detail.tracks[0];
        if (firstTrack.artist && detail.name) {
          displayName = `${firstTrack.artist} - ${detail.name}`;
        }
      }

      // Get artist image from first track if available (for albums/tracks)
      const artistImageUrl = detail.tracks?.[0]?.primaryArtistImage || null;

      playlist2Save = {
        ...playlist,
        name: displayName,
        coverUrl: detail.image,
        type: detail.type,
        artistImageUrl: artistImageUrl,
      };
    } catch (err) {
      this.logger.error(`Error getting playlist details: ${err}`);
      playlist2Save = { ...playlist, error: String(err) };
    }
    const savedPlaylist = await this.save(playlist2Save);

    if (detail?.tracks && detail.tracks.length > 0) {
      this.logger.debug(
        `Starting to process ${detail.tracks.length} tracks for playlist ${savedPlaylist.name}`,
      );

      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Detect if it's a playlist, album, or individual track
      const isPlaylist = savedPlaylist.spotifyUrl?.includes('/playlist/');
      const isTrack = savedPlaylist.spotifyUrl?.includes('/track/');
      const isAlbum = !isPlaylist && !isTrack;

      for (const track of detail.tracks) {
        try {
          if (!track.artist || !track.name) {
            this.logger.warn(
              `Skipping track ${processedCount + skippedCount + 1}: Missing artist or name information`,
            );
            skippedCount++;
            continue;
          }

          if (track.unavailable === true) {
            this.logger.warn(
              `Skipping unavailable track ${processedCount + skippedCount + 1}: ${track.artist} - ${track.name}`,
            );
            skippedCount++;
            continue;
          }

          // For albums/tracks: use primaryArtist from Spotify if available
          // For playlists: use the full artist string
          const artistToUse =
            (isAlbum || isTrack) && track.primaryArtist
              ? track.primaryArtist
              : track.artist;

          await this.trackService.create(
            {
              artist: artistToUse,
              name: track.name,
              album: track.album || (isTrack ? 'Singles' : savedPlaylist.name),
              albumYear: track.albumYear,
              trackNumber: track.trackNumber || processedCount + 1,
              spotifyUrl: track.previewUrl || null,
              artists: track.artists,
              trackUrl: track.trackUrl,
            },
            savedPlaylist,
          );

          processedCount++;

          if (processedCount % 100 === 0) {
            this.logger.debug(
              `Processed ${processedCount} tracks so far for playlist ${savedPlaylist.name}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error creating track "${
              track?.artist || 'Unknown'
            } - ${track?.name || 'Unknown'}": ${error.message}`,
          );
          errorCount++;
        }
      }

      this.logger.debug(
        `Finished processing playlist ${savedPlaylist.name}: ` +
          `${processedCount} tracks processed, ${skippedCount} skipped, ${errorCount} errors`,
      );
    } else {
      this.logger.warn(`No tracks found for playlist ${savedPlaylist.name}`);
    }
  }

  async save(playlist: PlaylistEntity): Promise<PlaylistEntity> {
    const savedPlaylist = await this.repository.save(playlist);
    this.io.emit(WsPlaylistOperation.New, savedPlaylist);
    return savedPlaylist;
  }

  async update(id: number, playlist: Partial<PlaylistEntity>): Promise<void> {
    await this.repository.update(id, playlist);
    const dbPlaylist = await this.findOne(id);
    this.io.emit(WsPlaylistOperation.Update, dbPlaylist);
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
      } catch (err) {
        await this.update(playlist.id, { ...playlist, error: String(err) });
      }

      // Detect if it's a playlist, album, or individual track
      const isPlaylist = playlist.spotifyUrl?.includes('/playlist/');
      const isTrack = playlist.spotifyUrl?.includes('/track/');
      const isAlbum = !isPlaylist && !isTrack;

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
          album: track.album || (isTrack ? 'Singles' : playlist.name),
          albumYear: track.albumYear,
          trackNumber: track.trackNumber || i + 1,
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
