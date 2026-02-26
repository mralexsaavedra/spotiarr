import { NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyArtistClient } from "./spotify-artist.client";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyAlbum, SpotifyAlbumTracksResponse, SpotifyTrack } from "./spotify.types";

export class SpotifyAlbumClient extends SpotifyBaseClient {
  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    private readonly artistClient: SpotifyArtistClient,
  ) {
    super(authService, settingsService, "SpotifyAlbumClient");
  }

  /**
   * Get album details from Spotify API
   */
  async getAlbumTracks(albumId: string): Promise<NormalizedTrack[]> {
    try {
      const response = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/albums/${albumId}/tracks`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(404, "playlist_not_found", `Album not found: ${albumId}`);
        }
        if (response.status === 429) {
          throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
        }
        throw new AppError(
          response.status,
          "internal_server_error",
          `Failed to fetch album: ${response.status}`,
        );
      }

      const data = (await response.json()) as SpotifyAlbumTracksResponse;
      const albumResponse = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/albums/${albumId}`,
      );

      const albumData = (await albumResponse.json()) as SpotifyAlbum;

      // Get artist image (all tracks in album have same primary artist)
      const firstArtistId = data.items[0]?.artists[0]?.id;
      const artistImage = firstArtistId
        ? await this.artistClient.getArtistImage(firstArtistId)
        : null;

      return data.items.map((track: SpotifyTrack) => {
        const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
          album: albumData,
          primaryArtistImage: artistImage,
        });

        return {
          ...normalized,
          album: normalized.album!, // We know album exists here
        };
      });
    } catch (error) {
      this.log(`Failed to get album tracks: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
