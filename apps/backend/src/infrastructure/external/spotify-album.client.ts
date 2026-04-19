import { NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { PromiseCache } from "./promise-cache";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import type { SpotifyLimiterMode } from "./spotify-http.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyAlbum, SpotifyAlbumTracksResponse, SpotifyTrack } from "./spotify.types";

export class SpotifyAlbumClient extends SpotifyBaseClient {
  private readonly requestCache: PromiseCache;

  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    requestCache: PromiseCache,
    limiterMode: SpotifyLimiterMode = "interactive",
  ) {
    super(authService, settingsService, "SpotifyAlbumClient", limiterMode);
    this.requestCache = requestCache;
  }

  getAlbumDetails(albumId: string): Promise<SpotifyAlbum> {
    return this.requestCache.getOrSet(`album-detail:${albumId}`, async () => {
      const albumResponse = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/albums/${albumId}`,
      );

      if (!albumResponse.ok) {
        throw new AppError(
          albumResponse.status,
          "internal_server_error",
          `Failed to fetch album details: ${albumResponse.status}`,
        );
      }

      return (await albumResponse.json()) as SpotifyAlbum;
    });
  }

  /**
   * Get album details from Spotify API
   */
  async getAlbumTracks(albumId: string): Promise<NormalizedTrack[]> {
    return this.requestCache.getOrSet(`album-tracks:${albumId}`, async () => {
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
        const albumData = await this.getAlbumDetails(albumId);

        return data.items.map((track: SpotifyTrack) => {
          const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
            album: albumData,
            primaryArtistImage: null,
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
    });
  }
}
