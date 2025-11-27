import { TrackStatusEnum } from "@spotiarr/shared";
import * as fs from "fs";
import * as path from "path";
import { PlaylistEntity } from "../entities/playlist.entity";
import { TrackEntity } from "../entities/track.entity";
import { SettingsService } from "./settings.service";

export class M3uService {
  private readonly settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
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
    try {
      const enabled = await this.settingsService.getBoolean("M3U_GENERATION_ENABLED");

      if (!enabled) {
        return;
      }

      const format = await this.settingsService.getString("FORMAT");

      // Filter only completed tracks
      const completedTracks = tracks.filter((track) => track.status === TrackStatusEnum.Completed);

      if (completedTracks.length === 0) {
        console.warn(`No completed tracks for playlist "${playlist.name}"`);
        return;
      }

      const m3uContent = this.buildM3uContent(playlist, completedTracks, format);
      const m3uFilePath = path.join(
        playlistFolderPath,
        this.sanitizeFileName(`${playlist.name}.m3u8`),
      );

      // Write the M3U8 file
      fs.writeFileSync(m3uFilePath, m3uContent, "utf-8");

      console.debug(`M3U playlist generated: ${m3uFilePath} (${completedTracks.length} tracks)`);
    } catch (error) {
      console.error(`Failed to generate M3U file: ${(error as Error).message}`);
    }
  }

  /**
   * Builds the M3U file content in Extended M3U format
   */
  private buildM3uContent(playlist: PlaylistEntity, tracks: TrackEntity[], format: string): string {
    const lines: string[] = [];

    // Header - Extended M3U indicator
    lines.push("#EXTM3U");

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
      const fileName = this.getTrackFileName(track, format);
      lines.push(fileName);

      // Empty line between tracks for readability
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Gets the track file name following Jellyfin structure
   * Only used for playlists (M3U files are only generated for playlists)
   */
  private getTrackFileName(track: TrackEntity, format: string): string {
    const artistName = this.sanitizeFileName(track.artist || "Unknown Artist");
    const trackName = this.sanitizeFileName(track.name || "Unknown Track");
    const trackNumber = String(track.trackNumber ?? 1).padStart(2, "0");

    // For playlists: tracks are in the same folder as the M3U file
    // Format: 01 - Artist - Track.mp3
    return `${trackNumber} - ${artistName} - ${trackName}.${format}`;
  }

  /**
   * Sanitizes the file name by removing invalid characters
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Counts how many tracks are completed
   */
  getCompletedTracksCount(tracks: TrackEntity[]): number {
    return tracks.filter((track) => track.status === TrackStatusEnum.Completed).length;
  }
}
