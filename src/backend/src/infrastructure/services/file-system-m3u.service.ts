import { TrackStatusEnum, type IPlaylist, type ITrack } from "@spotiarr/shared";
import * as fs from "fs";
import * as path from "path";
import { SettingsService } from "@/application/services/settings.service";
import { getErrorMessage } from "../utils/error.utils";
import { FileSystemTrackPathService } from "./file-system-track-path.service";

export class FileSystemM3uService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly trackPathService: FileSystemTrackPathService,
  ) {}

  /**
   * Generates an M3U8 file for a playlist
   * @param playlist - The playlist entity
   * @param tracks - Array of completed tracks from the playlist
   * @param playlistFolderPath - Path to the playlist folder
   */
  async generateM3uFile(
    playlist: IPlaylist,
    tracks: ITrack[],
    playlistFolderPath: string,
  ): Promise<void> {
    try {
      const enabled = await this.settingsService.getBoolean("M3U_GENERATION_ENABLED");

      if (!enabled) {
        return;
      }

      // Filter only completed tracks
      const completedTracks = tracks.filter((track) => track.status === TrackStatusEnum.Completed);

      if (completedTracks.length === 0) {
        console.warn(`No completed tracks for playlist "${playlist.name}"`);
        return;
      }

      const m3uContent = await this.buildM3uContent(playlist, completedTracks);
      const m3uFilePath = path.join(
        playlistFolderPath,
        this.sanitizeFileName(`${playlist.name}.m3u8`),
      );

      // Write the M3U8 file
      fs.writeFileSync(m3uFilePath, m3uContent, "utf-8");

      console.debug(`M3U playlist generated: ${m3uFilePath} (${completedTracks.length} tracks)`);
    } catch (error) {
      console.error(`Failed to generate M3U file: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Builds the M3U file content in Extended M3U format
   */
  private async buildM3uContent(playlist: IPlaylist, tracks: ITrack[]): Promise<string> {
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

      // Get the accurate filename using the centralized service
      // This ensures it matches exactly what is on disk (using playlistIndex logic)
      const fullPath = await this.trackPathService.getTrackFileName(track, playlist.name);
      const fileName = path.basename(fullPath);

      lines.push(fileName);

      // Empty line between tracks for readability
      lines.push("");
    }

    return lines.join("\n");
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
  getCompletedTracksCount(tracks: ITrack[]): number {
    return tracks.filter((track) => track.status === TrackStatusEnum.Completed).length;
  }
}
