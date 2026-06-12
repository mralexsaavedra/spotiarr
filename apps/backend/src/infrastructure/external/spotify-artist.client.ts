import type { SettingsPort } from "@/application/ports/settings.port";
import { getErrorMessage } from "../utils/error.utils";
import { CircuitBreaker } from "./circuit-breaker";
import { PromiseCache } from "./promise-cache";
import { RateLimiter } from "./rate-limiter";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import type { SpotifyLimiterMode } from "./spotify-http.client";
import { SpotifyExternalUrls, SpotifyImage } from "./spotify.types";

export class SpotifyArtistClient extends SpotifyBaseClient {
  private readonly requestCache: PromiseCache;

  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsPort,
    requestCache: PromiseCache,
    appTokenCircuitBreaker: CircuitBreaker,
    appTokenRateLimiter: RateLimiter,
    limiterMode: SpotifyLimiterMode = "interactive",
  ) {
    super(
      authService,
      settingsService,
      "SpotifyArtistClient",
      appTokenCircuitBreaker,
      appTokenRateLimiter,
      limiterMode,
    );
    this.requestCache = requestCache;
  }

  /**
   * Get artist metadata from Spotify API
   */
  async getArtistRaw(artistId: string): Promise<{
    name?: string;
    images?: SpotifyImage[];
    external_urls?: SpotifyExternalUrls;
    genres?: string[];
  } | null> {
    return this.requestCache.getOrSet(`artist-raw:${artistId}`, async () => {
      try {
        const response = await this.fetchWithAppToken(
          `https://api.spotify.com/v1/artists/${artistId}`,
        );

        if (!response.ok) {
          this.log(`Failed to fetch artist data: ${response.status}`);
          return null;
        }

        return (await response.json()) as {
          name?: string;
          images?: SpotifyImage[];
          external_urls?: SpotifyExternalUrls;
          genres?: string[];
        };
      } catch (error) {
        this.log(`Failed to fetch artist data: ${getErrorMessage(error)}`);
        return null;
      }
    });
  }

  /**
   * Get artist metadata (name and primary image) from Spotify API
   */
  async getArtistDetails(artistId: string): Promise<{
    name: string;
    image: string | null;
    spotifyUrl: string | null;
    followers: number | null;
    genres: string[];
  }> {
    try {
      const artist = await this.getArtistRaw(artistId);
      if (!artist || !artist.name) {
        return {
          name: "Unknown Artist",
          image: null,
          spotifyUrl: null,
          followers: null,
          genres: [],
        };
      }

      return {
        name: artist.name,
        image: artist.images?.[0]?.url || null,
        spotifyUrl: artist.external_urls?.spotify || null,
        followers: null,
        genres: artist.genres ?? [],
      };
    } catch (error) {
      this.log(`Failed to get artist details: ${getErrorMessage(error)}`);
      return {
        name: "Unknown Artist",
        image: null,
        spotifyUrl: null,
        followers: null,
        genres: [],
      };
    }
  }
}
