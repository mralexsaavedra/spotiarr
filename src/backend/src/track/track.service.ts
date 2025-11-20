import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { TrackEntity, TrackStatusEnum } from './track.entity';
import { PlaylistEntity } from '../playlist/playlist.entity';
import { UtilsService } from '../shared/utils.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { YoutubeService } from '../shared/youtube.service';
import { M3uService } from '../shared/m3u.service';
import { SpotifyUrlHelper } from '../shared/spotify-url.helper';
import { TrackGateway } from './track.gateway';
import { TrackRepository } from './track.repository';
import { TrackFileHelper } from '../shared/track-file.helper';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TrackService {
  private readonly logger = new Logger(TrackService.name);

  constructor(
    private readonly repository: TrackRepository,
    @InjectQueue('track-download-processor') private trackDownloadQueue: Queue,
    @InjectQueue('track-search-processor') private trackSearchQueue: Queue,
    private readonly utilsService: UtilsService,
    private readonly youtubeService: YoutubeService,
    private readonly m3uService: M3uService,
    private readonly trackGateway: TrackGateway,
    private readonly trackFileHelper: TrackFileHelper,
  ) {}

  getAll(
    where?: { [key: string]: any },
    relations: Record<string, boolean> = {},
  ): Promise<TrackEntity[]> {
    return this.repository.findAll(where, relations);
  }

  getAllByPlaylist(id: number): Promise<TrackEntity[]> {
    return this.repository.findAllByPlaylist(id);
  }

  get(id: number): Promise<TrackEntity | null> {
    return this.repository.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
    this.trackGateway.emitDelete(id);
  }

  async create(track: TrackEntity, playlist?: PlaylistEntity): Promise<void> {
    const savedTrack = await this.repository.save({ ...track, playlist });
    await this.trackSearchQueue.add('', savedTrack, {
      jobId: `id-${savedTrack.id}`,
    });
    this.trackGateway.emitNew(savedTrack, playlist.id);
  }

  async update(id: number, track: TrackEntity): Promise<void> {
    await this.repository.update(id, track);
    this.trackGateway.emitUpdate(track);
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
    } catch (error) {
      this.logger.error(
        `Failed to find track on YouTube: ${track.artist} - ${track.name}`,
        error instanceof Error ? error.stack : String(error),
      );
      updatedTrack = {
        ...track,
        error: error instanceof Error ? error.message : String(error),
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
      const errorMsg = `Track or playlist field is null or undefined: name=${track.name}, artist=${track.artist}, playlist=${track.playlist ? 'ok' : 'null'}, coverUrl=${track.playlist?.coverUrl}`;
      this.logger.error(errorMsg);
      throw new HttpException(errorMsg, HttpStatus.BAD_REQUEST);
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
      this.logger.error(
        `Failed to download track: ${track.artist} - ${track.name}`,
        err instanceof Error ? err.stack : String(err),
      );
      error = err instanceof Error ? err.message : String(err);
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

        const isPlaylist = SpotifyUrlHelper.isPlaylist(
          track.playlist.spotifyUrl,
        );
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
        this.logger.error(
          'Failed to generate M3U file',
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  getTrackFileName(track: TrackEntity): string {
    return this.trackFileHelper.getTrackFileName(track);
  }

  getFolderName(track: TrackEntity): string {
    return this.trackFileHelper.getFolderName(track);
  }
}
