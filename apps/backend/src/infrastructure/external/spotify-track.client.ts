import { NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { PromiseCache } from "./promise-cache";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import type { SpotifyLimiterMode } from "./spotify-http.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyTrack } from "./spotify.types";

export class SpotifyTrackClient extends SpotifyBaseClient {
  private readonly requestCache: PromiseCache;

  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    limiterMode: SpotifyLimiterMode = "interactive",
    requestCache?: PromiseCache,
  ) {
    super(authService, settingsService, "SpotifyTrackClient", limiterMode);
    this.requestCache = requestCache ?? new PromiseCache({ ttlMs: 30_000 });
  }

  /**
   * Get track details from Spotify API for a single track
   */
  async getTrackDetails(trackId: string): Promise<NormalizedTrack> {
    return this.requestCache.getOrSet(`track-detail:${trackId}`, async () => {
      try {
        const response = await this.fetchWithAppToken(
          `https://api.spotify.com/v1/tracks/${trackId}`,
        );

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

        // Use the unified mapper
        const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
          primaryArtistImage: null,
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
    });
  }
}
