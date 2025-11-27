import { TrackEntity } from "../entities/track.entity";
import { SettingsService } from "../services/settings.service";
import { UtilsService } from "../services/utils.service";
import { SpotifyUrlHelper } from "./spotify-url.helper";

export class TrackFileHelper {
  private utilsService: UtilsService;
  private settingsService: SettingsService;

  constructor() {
    this.utilsService = new UtilsService();
    this.settingsService = new SettingsService();
  }

  async getTrackFileName(track: TrackEntity): Promise<string> {
    const format = await this.settingsService.getString("FORMAT");
    const trackName = track.name || "Unknown Track";
    const trackNumber = track.trackNumber ?? 1;
    const artistName = track.artist || "Unknown Artist";

    // Check if this track belongs to a Spotify playlist
    const isPlaylist = SpotifyUrlHelper.isPlaylist(track.playlist?.spotifyUrl || "");

    if (isPlaylist) {
      // For playlists: keep all artists in the filename
      const playlistName = track.playlist?.name || "Unknown Playlist";
      return this.utilsService.getPlaylistTrackFilePath(
        playlistName,
        artistName,
        trackName,
        trackNumber,
        format,
      );
    } else {
      // For albums/tracks: artist is already the primary artist from Spotify
      const albumName = track.album || track.playlist?.name || "Unknown Album";
      return this.utilsService.getTrackFilePath(
        artistName,
        albumName,
        trackName,
        trackNumber,
        format,
      );
    }
  }

  async getFolderName(track: TrackEntity): Promise<string> {
    // Use Jellyfin-compatible structure
    return this.getTrackFileName(track);
  }
}
