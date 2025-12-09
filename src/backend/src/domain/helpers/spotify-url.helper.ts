import { AppError } from "../../presentation/middleware/error-handler";

export enum SpotifyUrlType {
  Playlist = "playlist",
  Album = "album",
  Track = "track",
  Artist = "artist",
}

/**
 * Helper for detecting and working with Spotify URL types
 */
export class SpotifyUrlHelper {
  /**
   * Detects the type of Spotify URL
   * @param url - Spotify URL to analyze
   * @returns The type of content (playlist, album, track, or artist)
   */
  static getUrlType(url: string): SpotifyUrlType {
    if (!url) {
      throw new AppError(400, "invalid_spotify_url", "Invalid Spotify URL: URL is empty");
    }

    if (url.includes("/playlist/")) {
      return SpotifyUrlType.Playlist;
    }

    if (url.includes("/track/")) {
      return SpotifyUrlType.Track;
    }

    if (url.includes("/album/")) {
      return SpotifyUrlType.Album;
    }

    if (url.includes("/artist/")) {
      return SpotifyUrlType.Artist;
    }

    throw new AppError(400, "invalid_spotify_url", `Unknown Spotify URL type: ${url}`);
  }

  /**
   * Checks if the URL is a playlist
   */
  static isPlaylist(url: string): boolean {
    return this.getUrlType(url) === SpotifyUrlType.Playlist;
  }

  /**
   * Checks if the URL is an album
   */
  static isAlbum(url: string): boolean {
    return this.getUrlType(url) === SpotifyUrlType.Album;
  }

  /**
   * Checks if the URL is a track
   */
  static isTrack(url: string): boolean {
    return this.getUrlType(url) === SpotifyUrlType.Track;
  }

  /**
   * Extracts the ID from a Spotify URL
   * @param url - Spotify URL
   * @returns The extracted ID
   */
  static extractId(url: string): string {
    const match = url.match(/\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
    if (!match) {
      throw new AppError(
        400,
        "invalid_spotify_url",
        `Could not extract ID from Spotify URL: ${url}`,
      );
    }
    return match[2];
  }
}
