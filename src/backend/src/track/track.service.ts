import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackEntity, TrackStatusEnum } from './track.entity';
import { PlaylistEntity } from '../playlist/playlist.entity';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { EnvironmentEnum } from '../environmentEnum';
import { UtilsService } from '../shared/utils.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { YoutubeService } from '../shared/youtube.service';
import { M3uService } from '../shared/m3u.service';
import { SpotifyUrlHelper } from '../shared/spotify-url.helper';
import * as fs from 'fs';
import * as path from 'path';

enum WsTrackOperation {
  New = 'trackNew',
  Update = 'trackUpdate',
  Delete = 'trackDelete',
}

@WebSocketGateway()
@Injectable()
export class TrackService {
  @WebSocketServer() io: Server;
  private readonly logger = new Logger(TrackService.name);

  constructor(
    @InjectRepository(TrackEntity)
    private repository: Repository<TrackEntity>,
    @InjectQueue('track-download-processor') private trackDownloadQueue: Queue,
    @InjectQueue('track-search-processor') private trackSearchQueue: Queue,
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,
    private readonly youtubeService: YoutubeService,
    private readonly m3uService: M3uService,
  ) {}

  getAll(
    where?: { [key: string]: any },
    relations: Record<string, boolean> = {},
  ): Promise<TrackEntity[]> {
    return this.repository.find({ where, relations });
  }

  getAllByPlaylist(id: number): Promise<TrackEntity[]> {
    return this.repository.find({ where: { playlist: { id } } });
  }

  get(id: number): Promise<TrackEntity | null> {
    return this.repository.findOne({ where: { id }, relations: ['playlist'] });
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
    this.io.emit(WsTrackOperation.Delete, { id });
  }

  async create(track: TrackEntity, playlist?: PlaylistEntity): Promise<void> {
    const savedTrack = await this.repository.save({ ...track, playlist });
    await this.trackSearchQueue.add('', savedTrack, {
      jobId: `id-${savedTrack.id}`,
    });
    this.io.emit(WsTrackOperation.New, {
      track: savedTrack,
      playlistId: playlist.id,
    });
  }

  async update(id: number, track: TrackEntity): Promise<void> {
    await this.repository.update(id, track);
    this.io.emit(WsTrackOperation.Update, track);
  }

  async retry(id: number): Promise<void> {
    const track = await this.get(id);
    await this.trackSearchQueue.add('', track, { jobId: `id-${id}` });
    await this.update(id, { ...track, status: TrackStatusEnum.New });
  }

  async findOnYoutube(track: TrackEntity): Promise<void> {
    if (!(await this.get(track.id))) {
      return;
    }
    await this.update(track.id, {
      ...track,
      status: TrackStatusEnum.Searching,
    });
    let updatedTrack: TrackEntity;
    try {
      const youtubeUrl = await this.youtubeService.findOnYoutubeOne(
        track.artist,
        track.name,
      );
      updatedTrack = { ...track, youtubeUrl, status: TrackStatusEnum.Queued };
    } catch (err) {
      this.logger.error(err);
      updatedTrack = {
        ...track,
        error: String(err),
        status: TrackStatusEnum.Error,
      };
    }
    await this.trackDownloadQueue.add('', updatedTrack, {
      jobId: `id-${updatedTrack.id}`,
    });
    await this.update(track.id, updatedTrack);
  }

  async downloadFromYoutube(track: TrackEntity): Promise<void> {
    if (!(await this.get(track.id))) {
      return;
    }
    if (
      !track.name ||
      !track.artist ||
      !track.playlist ||
      !track.playlist.coverUrl
    ) {
      this.logger.error(
        `Track or playlist field is null or undefined: name=${track.name}, artist=${track.artist}, playlist=${track.playlist ? 'ok' : 'null'}, coverUrl=${track.playlist?.coverUrl}`,
      );
      return;
    }
    await this.update(track.id, {
      ...track,
      status: TrackStatusEnum.Downloading,
    });
    let error: string;
    try {
      const trackFilePath = this.getFolderName(track);
      const trackDirectory = path.dirname(trackFilePath);

      // Create the directory structure if it doesn't exist (Artist/Album/)
      if (!fs.existsSync(trackDirectory)) {
        fs.mkdirSync(trackDirectory, { recursive: true });
      }

      await this.youtubeService.downloadAndFormat(track, trackFilePath);

      // Embed cover art in the audio file
      await this.youtubeService.addImage(
        trackFilePath,
        track.playlist.coverUrl,
        track.name,
        track.artist,
        track.albumYear,
      );

      // Check if it's a playlist
      const isPlaylist = SpotifyUrlHelper.isPlaylist(track.playlist.spotifyUrl);

      if (isPlaylist) {
        // For playlists: save playlist cover in the playlist folder
        await this.youtubeService.saveCoverArt(
          trackDirectory,
          track.playlist.coverUrl,
        );
      } else {
        // For albums/tracks: save covers at album level and artist level
        const albumDirectory = trackDirectory;
        const artistDirectory = path.dirname(albumDirectory);

        // Save album cover (using playlist cover which is the album cover)
        await this.youtubeService.saveCoverArt(
          albumDirectory,
          track.playlist.coverUrl,
        );

        // Save artist cover (using artist image from Spotify)
        if (track.playlist.artistImageUrl) {
          await this.youtubeService.saveCoverArt(
            artistDirectory,
            track.playlist.artistImageUrl,
          );
        }
      }
    } catch (err) {
      this.logger.error(err);
      error = String(err);
    }
    const updatedTrack = {
      ...track,
      status: error ? TrackStatusEnum.Error : TrackStatusEnum.Completed,
      ...(error ? { error } : {}),
    };
    await this.update(track.id, updatedTrack);

    if (!error && track.playlist && this.m3uService.isEnabled()) {
      try {
        const playlistTracks = await this.getAllByPlaylist(track.playlist.id);

        const isPlaylist = SpotifyUrlHelper.isPlaylist(track.playlist.spotifyUrl);
        const hasMultipleTracks = playlistTracks.length > 1;

        if (isPlaylist && hasMultipleTracks) {
          const completedCount =
            this.m3uService.getCompletedTracksCount(playlistTracks);
          const totalCount = playlistTracks.length;

          this.logger.debug(
            `Playlist "${track.playlist.name}": ${completedCount}/${totalCount} tracks completed`,
          );

          const playlistFolderPath = this.utilsService.getPlaylistFolderPath(
            track.playlist.name,
          );

          await this.m3uService.generateM3uFile(
            track.playlist,
            playlistTracks,
            playlistFolderPath,
          );

          if (this.m3uService.isPlaylistComplete(playlistTracks)) {
            this.logger.log(
              `🎉 Playlist "${track.playlist.name}" fully completed! M3U file updated.`,
            );
          }
        }
      } catch (err) {
        this.logger.error(`Failed to generate M3U: ${err.message}`);
      }
    }
  }

  getTrackFileName(track: TrackEntity): string {
    const format = this.configService.get<string>(EnvironmentEnum.FORMAT);
    const trackName = track.name || 'Unknown Track';
    const trackNumber = track.trackNumber ?? 1;
    const artistName = track.artist || 'Unknown Artist';

    // Check if this track belongs to a Spotify playlist
    const isPlaylist = SpotifyUrlHelper.isPlaylist(track.playlist?.spotifyUrl);

    if (isPlaylist) {
      // For playlists: keep all artists in the filename
      const playlistName = track.playlist?.name || 'Unknown Playlist';
      return this.utilsService.getPlaylistTrackFilePath(
        playlistName,
        artistName,
        trackName,
        trackNumber,
        format,
      );
    } else {
      // For albums/tracks: artist is already the primary artist from Spotify
      const albumName = track.album || track.playlist?.name || 'Unknown Album';
      return this.utilsService.getTrackFilePath(
        artistName,
        albumName,
        trackName,
        trackNumber,
        format,
      );
    }
  }

  getFolderName(track: TrackEntity): string {
    // Use Jellyfin-compatible structure
    return this.getTrackFileName(track);
  }
}
