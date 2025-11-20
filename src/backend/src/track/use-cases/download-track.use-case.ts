import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { TrackEntity, TrackStatusEnum } from '../track.entity';
import { TrackRepository } from '../track.repository';
import { TrackGateway } from '../track.gateway';
import { YoutubeService } from '../../shared/youtube.service';
import { M3uService } from '../../shared/m3u.service';
import { UtilsService } from '../../shared/utils.service';
import { TrackFileHelper } from '../../shared/track-file.helper';
import { SpotifyUrlHelper } from '../../shared/spotify-url.helper';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DownloadTrackUseCase {
  private readonly logger = new Logger(DownloadTrackUseCase.name);

  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly trackGateway: TrackGateway,
    private readonly youtubeService: YoutubeService,
    private readonly m3uService: M3uService,
    private readonly utilsService: UtilsService,
    private readonly trackFileHelper: TrackFileHelper,
  ) {}

  async execute(track: TrackEntity): Promise<void> {
    // Validate track exists
    if (!(await this.trackRepository.findOne(track.id))) {
      return;
    }

    // Validate required fields
    this.validateTrack(track);

    // Update status to Downloading
    await this.trackRepository.update(track.id, {
      ...track,
      status: TrackStatusEnum.Downloading,
    });
    this.trackGateway.emitUpdate({
      ...track,
      status: TrackStatusEnum.Downloading,
    });

    let error: string | undefined;

    try {
      await this.downloadAndProcessTrack(track);
    } catch (err) {
      this.logger.error(
        `Failed to download track: ${track.artist} - ${track.name}`,
        err instanceof Error ? err.stack : String(err),
      );
      error = err instanceof Error ? err.message : String(err);
    }

    // Update final status
    const updatedTrack = {
      ...track,
      status: error ? TrackStatusEnum.Error : TrackStatusEnum.Completed,
      ...(error ? { error } : {}),
    };

    await this.trackRepository.update(track.id, updatedTrack);
    this.trackGateway.emitUpdate(updatedTrack);

    // Generate M3U if successful
    if (!error && track.playlist && this.m3uService.isEnabled()) {
      await this.generateM3uIfNeeded(track);
    }
  }

  private validateTrack(track: TrackEntity): void {
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
  }

  private async downloadAndProcessTrack(track: TrackEntity): Promise<void> {
    const trackFilePath = this.trackFileHelper.getFolderName(track);
    const trackDirectory = path.dirname(trackFilePath);

    // Create directory structure
    if (!fs.existsSync(trackDirectory)) {
      fs.mkdirSync(trackDirectory, { recursive: true });
    }

    // Download and format audio
    await this.youtubeService.downloadAndFormat(track, trackFilePath);

    // Embed cover art
    await this.youtubeService.addImage(
      trackFilePath,
      track.playlist.coverUrl,
      track.name,
      track.artist,
      track.albumYear,
    );

    // Save cover images
    await this.saveCoverImages(track, trackDirectory);
  }

  private async saveCoverImages(
    track: TrackEntity,
    trackDirectory: string,
  ): Promise<void> {
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

      // Save album cover
      await this.youtubeService.saveCoverArt(
        albumDirectory,
        track.playlist.coverUrl,
      );

      // Save artist cover
      if (track.playlist.artistImageUrl) {
        await this.youtubeService.saveCoverArt(
          artistDirectory,
          track.playlist.artistImageUrl,
        );
      }
    }
  }

  private async generateM3uIfNeeded(track: TrackEntity): Promise<void> {
    try {
      const playlistTracks = await this.trackRepository.findAllByPlaylist(
        track.playlist.id,
      );

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
