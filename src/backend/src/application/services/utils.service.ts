import { resolve } from "path";
import { getEnv } from "@/infrastructure/setup/environment";

export class UtilsService {
  constructor() {}

  /**
   * Get the base music library path
   */
  getMusicLibraryPath(): string {
    return resolve(__dirname, "../..", getEnv().DOWNLOADS_PATH);
  }

  /**
   * Get the artist folder path following Jellyfin structure: Music/Artist/
   */
  getArtistFolderPath(artistName: string): string {
    return resolve(
      this.getMusicLibraryPath(),
      this.stripFileIllegalChars(artistName || "Unknown Artist"),
    );
  }

  /**
   * Get the album folder path following Jellyfin structure: Music/Artist/Album/
   */
  getAlbumFolderPath(artistName: string, albumName: string): string {
    return resolve(
      this.getArtistFolderPath(artistName),
      this.stripFileIllegalChars(albumName || "Unknown Album"),
    );
  }

  /**
   * Get track file path following Jellyfin structure: Music/Artist/Album/TrackNumber - Track Name.ext
   */
  getTrackFilePath(
    artistName: string,
    albumName: string,
    trackName: string,
    trackNumber: number,
    format: string,
  ): string {
    const paddedNumber = String(trackNumber).padStart(2, "0");
    const fileName = `${paddedNumber} - ${this.stripFileIllegalChars(trackName)}.${format}`;
    return resolve(this.getAlbumFolderPath(artistName, albumName), fileName);
  }

  /**
   * Get the playlists folder path: Music/Playlists/
   */
  getPlaylistsLibraryPath(): string {
    return resolve(this.getMusicLibraryPath(), "Playlists");
  }

  /**
   * Get specific playlist folder path: Music/Playlists/PlaylistName/
   */
  getPlaylistFolderPath(playlistName: string): string {
    return resolve(
      this.getPlaylistsLibraryPath(),
      this.stripFileIllegalChars(playlistName || "Unknown Playlist"),
    );
  }

  /**
   * Get track file path for playlist: Music/Playlists/PlaylistName/TrackNumber - Artist - Track Name.ext
   */
  getPlaylistTrackFilePath(
    playlistName: string,
    artistName: string,
    trackName: string,
    trackNumber: number,
    format: string,
  ): string {
    const paddedNumber = String(trackNumber).padStart(2, "0");
    const safeArtist = this.stripFileIllegalChars(artistName || "Unknown Artist");
    const safeTrack = this.stripFileIllegalChars(trackName || "Unknown Track");
    const fileName = `${paddedNumber} - ${safeArtist} - ${safeTrack}.${format}`;
    return resolve(this.getPlaylistFolderPath(playlistName), fileName);
  }

  stripFileIllegalChars(text: string): string {
    return text.replace(/[/\\?%*:|"<>]/g, "-");
  }
}
