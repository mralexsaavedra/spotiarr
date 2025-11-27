import type { ITrack } from "@spotiarr/shared";
import { SettingsService } from "../services/settings.service";
import { UtilsService } from "../services/utils.service";

export class TrackFileHelper {
  private utilsService: UtilsService;
  private settingsService: SettingsService;

  constructor() {
    this.utilsService = new UtilsService();
    this.settingsService = new SettingsService();
  }

  async getTrackFileName(track: ITrack): Promise<string> {
    const format = await this.settingsService.getString("FORMAT");
    const trackName = track.name || "Unknown Track";
    const trackNumber = track.trackNumber ?? 1;
    const artistName = track.artist || "Unknown Artist";
    const albumName = track.album || "Unknown Album";

    return this.utilsService.getTrackFilePath(
      artistName,
      albumName,
      trackName,
      trackNumber,
      format,
    );
  }

  async getFolderName(track: ITrack): Promise<string> {
    return this.getTrackFileName(track);
  }
}
