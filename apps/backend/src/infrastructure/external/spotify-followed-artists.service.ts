import type { FollowedArtist } from "@spotiarr/shared";
import type { SettingsPort } from "@/application/ports/settings.port";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import type { CacheEntry } from "./cache.types";
import { PromiseCache } from "./promise-cache";
import type { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient, type SpotifyLimiterMode } from "./spotify-http.client";
import type { SpotifyArtistFull, SpotifyFollowedArtistsResponse } from "./spotify.types";

const FOLLOWED_ARTISTS_CACHE_KEY = "followed-artists:list";
const FOLLOWED_ARTISTS_IN_FLIGHT_KEY = "followed-artists:in-flight";

export class SpotifyFollowedArtistsService extends SpotifyHttpClient {
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly inFlightPromises = new PromiseCache({ ttlMs: 30_000 });

  constructor(
    private readonly settingsService: SettingsPort,
    authService: SpotifyAuthService,
    limiterMode: SpotifyLimiterMode = "user",
  ) {
    super(authService, limiterMode);
  }

  clearCache(): void {
    this.cache.clear();
    this.inFlightPromises.clear();
  }

  private getCacheKey(method: string, ...args: unknown[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const cacheMinutes = await this.settingsService.getNumber("RELEASES_CACHE_MINUTES");
    const cacheTTL = cacheMinutes * 60 * 1000;
    if (Date.now() - entry.createdAt > cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { value: data, createdAt: Date.now(), ttlMs: 0 });
  }

  private async getFollowedArtistsSnapshot(maxArtists: number): Promise<SpotifyArtistFull[]> {
    const cacheKey = this.getCacheKey(FOLLOWED_ARTISTS_CACHE_KEY, maxArtists);
    const cached = await this.getFromCache<SpotifyArtistFull[]>(cacheKey);
    if (cached) return cached;

    return this.inFlightPromises.getOrSet(
      `${FOLLOWED_ARTISTS_IN_FLIGHT_KEY}:${maxArtists}`,
      async () => {
        const warmCache = await this.getFromCache<SpotifyArtistFull[]>(cacheKey);
        if (warmCache) return warmCache;

        const artists = await this.fetchAllFollowedArtists(maxArtists);
        const slicedArtists = artists.slice(0, maxArtists);
        this.setCache(cacheKey, slicedArtists);
        return slicedArtists;
      },
    );
  }

  async getFollowedArtists(): Promise<FollowedArtist[]> {
    const cacheKey = this.getCacheKey("getFollowedArtists");
    const cached = await this.getFromCache<FollowedArtist[]>(cacheKey);
    if (cached) return cached;

    try {
      const maxArtists = await this.settingsService.getNumber("FOLLOWED_ARTISTS_MAX");
      const artists = await this.getFollowedArtistsSnapshot(maxArtists);
      const sorted = artists.slice(0, maxArtists).sort((a, b) => a.name.localeCompare(b.name));
      const mapped = sorted.map((artist) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url ?? null,
        spotifyUrl: artist.external_urls?.spotify ?? null,
      }));
      this.setCache(cacheKey, mapped);
      return mapped;
    } catch (error) {
      console.error(`[SpotifyFollowedArtistsService] ${getErrorMessage(error)}`);
      throw error;
    }
  }

  private async fetchAllFollowedArtists(maxArtists: number): Promise<SpotifyArtistFull[]> {
    const artists: SpotifyArtistFull[] = [];
    let after: string | undefined;
    const pageLimit = Math.min(Math.max(maxArtists, 1), 50);

    do {
      const url = new URL("https://api.spotify.com/v1/me/following");
      url.searchParams.set("type", "artist");
      url.searchParams.set("limit", pageLimit.toString());
      if (after) url.searchParams.set("after", after);

      const response = await this.fetchWithUserToken(url.toString());
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          throw new AppError(
            401,
            "missing_user_access_token",
            "Spotify user token expired or invalid",
          );
        }
        if (response.status === 429) {
          throw new AppError(
            429,
            "spotify_rate_limited",
            `Spotify rate limit exceeded while fetching followed artists: ${errorText}`,
          );
        }
        throw new AppError(
          response.status,
          "failed_to_fetch_followed_artists",
          `Failed to fetch followed artists: ${response.status} ${errorText}`,
        );
      }

      const data = (await response.json()) as SpotifyFollowedArtistsResponse;
      artists.push(...(data.artists?.items ?? []));
      after = data.artists?.cursors?.after;

      if (artists.length >= maxArtists) break;
    } while (after);

    return artists;
  }
}
