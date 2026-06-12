import type { AlbumType, ArtistRelease } from "@spotiarr/shared";
import type { SettingsPort } from "@/application/ports/settings.port";
import { AppError } from "@/domain/errors/app-error";
import type { CacheEntry } from "./cache.types";
import { CircuitBreaker } from "./circuit-breaker";
import { RateLimiter } from "./rate-limiter";
import type { SpotifyAuthService } from "./spotify-auth.service";
import { SPOTIFY_ARTIST_ALBUMS_MAX_LIMIT } from "./spotify-constants";
import { SpotifyHttpClient, type SpotifyLimiterMode } from "./spotify-http.client";
import type { SpotifyArtistAlbumsResponse } from "./spotify.types";

type CatalogArtist = { id: string; name: string; imageUrl?: string | null };

export class SpotifyArtistCatalogService extends SpotifyHttpClient {
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(
    private readonly settingsService: SettingsPort,
    authService: SpotifyAuthService,
    appTokenCircuitBreaker: CircuitBreaker,
    appTokenRateLimiter: RateLimiter,
    limiterMode: SpotifyLimiterMode = "user",
  ) {
    super(authService, appTokenCircuitBreaker, appTokenRateLimiter, limiterMode);
  }

  clearCache(): void {
    this.cache.clear();
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

  private async getMarket(): Promise<string> {
    try {
      return await this.settingsService.getString("SPOTIFY_MARKET");
    } catch {
      return "ES";
    }
  }

  async getArtistCatalogData(
    artists: CatalogArtist[],
    earlyStopBeforeDate?: Date,
  ): Promise<ArtistRelease[]> {
    const cacheKey = this.getCacheKey(
      "getArtistCatalogData",
      artists,
      earlyStopBeforeDate?.toISOString(),
    );
    const cached = await this.getFromCache<ArtistRelease[]>(cacheKey);
    if (cached) return cached;

    const market = await this.getMarket();
    const albumsPerArtist: ArtistRelease[][] = [];

    for (const artist of artists) {
      const albums: ArtistRelease[] = [];
      let offset = 0;
      let shouldStop = false;

      while (!shouldStop) {
        const albumsUrl = `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single,compilation&limit=${SPOTIFY_ARTIST_ALBUMS_MAX_LIMIT}&offset=${offset}&market=${market}`;
        const albumsResponse = await this.fetchWithAppToken(albumsUrl);

        if (!albumsResponse.ok) {
          const errorText = await albumsResponse.text();
          if (albumsResponse.status === 429) {
            throw new AppError(
              429,
              "spotify_rate_limited",
              "Rate limited by Spotify API while fetching artist catalog.",
            );
          }
          console.warn(
            `[SpotifyArtistCatalogService] Failed to fetch catalog for artist ${artist.id}: ${albumsResponse.status} ${errorText}`,
          );
          break;
        }

        const albumsData = (await albumsResponse.json()) as SpotifyArtistAlbumsResponse;
        const pageAlbums = albumsData.items ?? [];
        if (pageAlbums.length === 0) break;

        const mapped = pageAlbums.map((album) => ({
          artistId: artist.id,
          artistName: artist.name,
          artistImageUrl: artist.imageUrl ?? null,
          albumId: album.id as string,
          albumName: album.name,
          albumType: album.album_type as AlbumType,
          releaseDate: album.release_date,
          coverUrl: album.images?.[0]?.url ?? null,
          spotifyUrl: album.external_urls?.spotify,
          totalTracks: album.total_tracks,
        }));

        albums.push(...mapped);

        if (earlyStopBeforeDate && mapped.length > 0) {
          const oldestOnPage = mapped[mapped.length - 1];
          if (oldestOnPage?.releaseDate) {
            const parts = oldestOnPage.releaseDate.split("-");
            const year = Number(parts[0]);
            const month = parts.length >= 2 ? Number(parts[1]) - 1 : 0;
            const day = parts.length >= 3 ? Number(parts[2]) : 1;
            if (!Number.isNaN(year) && year > 0) {
              const oldestDate = new Date(year, month, day);
              if (oldestDate < earlyStopBeforeDate) shouldStop = true;
            }
          }
        }

        if (pageAlbums.length < SPOTIFY_ARTIST_ALBUMS_MAX_LIMIT) break;
        offset += pageAlbums.length;
      }

      albumsPerArtist.push(albums);
    }

    const flattened = albumsPerArtist.flat();
    this.setCache(cacheKey, flattened);
    return flattened;
  }
}
