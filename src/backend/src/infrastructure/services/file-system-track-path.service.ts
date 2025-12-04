import type { ITrack } from "@spotiarr/shared";
import { SettingsService } from "../../application/services/settings.service";
import { UtilsService } from "../../application/services/utils.service";

export class FileSystemTrackPathService {
  private utilsService: UtilsService;
  private settingsService: SettingsService;

  constructor() {
    this.utilsService = new UtilsService();
    this.settingsService = new SettingsService();
  }

  async getTrackFileName(track: ITrack, playlistName?: string): Promise<string> {
    const format = await this.settingsService.getString("FORMAT");
    const trackName = track.name || "Unknown Track";
    const trackNumber = track.trackNumber ?? 1;
    const artistName = track.artist || "Unknown Artist";
    const albumName = track.album || "Unknown Album";

    if (playlistName) {
      return this.utilsService.getPlaylistTrackFilePath(
        playlistName,
        artistName,
        trackName,
        trackNumber,
        format,
      );
    }

    return this.utilsService.getTrackFilePath(
      artistName,
      albumName,
      trackName,
      trackNumber,
      format,
    );
  }

  async getFolderName(track: ITrack, playlistName?: string): Promise<string> {
    return this.getTrackFileName(track, playlistName);
  }
}
