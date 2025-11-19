import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentEnum } from '../environmentEnum';
import * as fs from 'fs';
import * as path from 'path';
import { TrackEntity, TrackStatusEnum } from '../track/track.entity';
import { PlaylistEntity } from '../playlist/playlist.entity';

@Injectable()
export class M3uService {
  private readonly logger = new Logger(M3uService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>(
      'M3U_GENERATION_ENABLED',
      true,
    );
  }

  /**
   * Generates an M3U8 file for a playlist
   * @param playlist - The playlist entity
   * @param tracks - Array of completed tracks from the playlist
   * @param playlistFolderPath - Path to the playlist folder
   */
  async generateM3uFile(
    playlist: PlaylistEntity,
    tracks: TrackEntity[],
    playlistFolderPath: string,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      // Filter only completed tracks
      const completedTracks = tracks.filter(
        (track) => track.status === TrackStatusEnum.Completed,
      );

      if (completedTracks.length === 0) {
        this.logger.warn(`No completed tracks for playlist "${playlist.name}"`);
        return;
      }

      const m3uContent = this.buildM3uContent(playlist, completedTracks);
      const m3uFilePath = path.join(
        playlistFolderPath,
        this.sanitizeFileName(`${playlist.name}.m3u8`),
      );

      // Write the M3U8 file
      fs.writeFileSync(m3uFilePath, m3uContent, 'utf-8');

      this.logger.log(
        `M3U playlist generated: ${m3uFilePath} (${completedTracks.length} tracks)`,
      );
    } catch (error) {
      this.logger.error(`Failed to generate M3U file: ${error.message}`);
    }
  }

  /**
   * Builds the M3U file content in Extended M3U format
   */
  private buildM3uContent(
    playlist: PlaylistEntity,
    tracks: TrackEntity[],
  ): string {
    const lines: string[] = [];

    // Header - Extended M3U indicator
    lines.push('#EXTM3U');

    // Playlist information
    lines.push(`#PLAYLIST:${playlist.name}`);

    // Add each track
    for (const track of tracks) {
      // #EXTINF:<duration>,<artist> - <title>
      // Duration in seconds (we use -1 if not available)
      const duration = -1; // We could calculate this with ffprobe if needed
      const trackInfo = `${track.artist} - ${track.name}`;

      lines.push(`#EXTINF:${duration},${trackInfo}`);

      // Additional metadata (optional)
      lines.push(`#EXTART:${track.artist}`);

      // File path - use relative path
      const fileName = this.getTrackFileName(track);
      lines.push(fileName);

      // Empty line between tracks for readability
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Gets the track file name following Jellyfin structure
   * Only used for playlists (M3U files are only generated for playlists)
   */
  private getTrackFileName(track: TrackEntity): string {
    const format = this.configService.get<string>(
      EnvironmentEnum.FORMAT,
      'mp3',
    );
    const artistName = this.sanitizeFileName(track.artist || 'Unknown Artist');
    const trackName = this.sanitizeFileName(track.name || 'Unknown Track');
    const trackNumber = String(track.trackNumber ?? 1).padStart(2, '0');

    // For playlists: tracks are in the same folder as the M3U file
    // Format: 01 - Artist - Track.mp3
    return `${trackNumber} - ${artistName} - ${trackName}.${format}`;
  }

  /**
   * Sanitizes the file name by removing invalid characters
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Checks if all tracks in a playlist are completed
   */
  isPlaylistComplete(tracks: TrackEntity[]): boolean {
    if (!tracks || tracks.length === 0) {
      return false;
    }

    return tracks.every(
      (track) =>
        track.status === TrackStatusEnum.Completed ||
        track.status === TrackStatusEnum.Error, // Include errors to avoid blocking
    );
  }

  /**
   * Counts how many tracks are completed
   */
  getCompletedTracksCount(tracks: TrackEntity[]): number {
    return tracks.filter((track) => track.status === TrackStatusEnum.Completed)
      .length;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
