import { NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyArtistClient } from "./spotify-artist.client";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyTrack } from "./spotify.types";

export class SpotifyTrackClient extends SpotifyBaseClient {
  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    private readonly artistClient: SpotifyArtistClient, // Required to fetch artist images
  ) {
    super(authService, settingsService, "SpotifyTrackClient");
  }

  /**
   * Get track details from Spotify API for a single track
   */
  async getTrackDetails(trackId: string): Promise<NormalizedTrack> {
    try {
      const response = await this.fetchWithAppToken(`https://api.spotify.com/v1/tracks/${trackId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(404, "track_not_found", `Track not found: ${trackId}`);
        }
        if (response.status === 429) {
          throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
        }
        throw new AppError(
          response.status,
          "internal_server_error",
          `Failed to fetch track: ${response.status}`,
        );
      }

      const track = (await response.json()) as SpotifyTrack;

      // Get artist image
      const artistId = track.artists[0]?.id;
      const artistImage = artistId ? await this.artistClient.getArtistImage(artistId) : null;

      // Use the unified mapper
      const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
        primaryArtistImage: artistImage,
      });

      return {
        ...normalized,
        // Ensure strictly required fields for this return type (though normalized covers them)
        artist: normalized.artist,
        name: normalized.name,
        artists: normalized.artists,
      };
    } catch (error) {
      this.log(`Failed to get track details: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
