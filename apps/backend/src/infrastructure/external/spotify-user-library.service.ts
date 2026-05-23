import type { AlbumType, ArtistRelease, FollowedArtist, SpotifyPlaylist } from "@spotiarr/shared";
import type { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getEnv } from "../setup/environment";
import { getErrorMessage } from "../utils/error.utils";
import type { CacheEntry } from "./cache.types";
import { PromiseCache } from "./promise-cache";
import type { SpotifyAuthService } from "./spotify-auth.service";
import { SPOTIFY_ARTIST_ALBUMS_MAX_LIMIT } from "./spotify-constants";
import { SpotifyHttpClient } from "./spotify-http.client";
import type {
  SpotifyArtistAlbumsResponse,
  SpotifyArtistFull,
  SpotifyFollowedArtistsResponse,
  SpotifyImage,
} from "./spotify.types";

const FOLLOWED_ARTISTS_CACHE_KEY = "followed-artists:list";
const FOLLOWED_ARTISTS_IN_FLIGHT_KEY = "followed-artists:in-flight";
const PLAYLIST_ACCESS_CACHE_MAX_ENTRIES = 1_000;
const PLAYLIST_ACCESS_ALLOWED_TTL_MS = 30 * 60 * 1000;
const PLAYLIST_ACCESS_DENIED_TTL_MS = 5 * 60 * 1000;
const PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS = 60 * 1000;

type SpotifyCurrentUserResponse = {
  id: string;
};

type PlaylistAccessStatus = "allowed" | "denied" | "rate_limited";

type PlaylistAccessResult = {
  status: PlaylistAccessStatus;
  trackTotal?: number;
};

type PlaylistAccessCacheEntry = {
  status: Exclude<PlaylistAccessStatus, "rate_limited">;
  trackTotal?: number;
  expiresAt: number;
};

export type SpotifyUserPlaylistItem = {
  id: string;
  name: string;
  collaborative?: boolean;
  images: SpotifyImage[];
  owner: { id?: string; display_name: string; external_urls: { spotify: string } };
  tracks?: { total?: number };
  external_urls: { spotify: string };
};

export const isOwnedPlaylist = (item: SpotifyUserPlaylistItem, currentUserId: string) =>
  item.owner?.id === currentUserId;

export const needsPlaylistItemsAccessCheck = (
  item: SpotifyUserPlaylistItem,
  currentUserId: string,
) => !isOwnedPlaylist(item, currentUserId);

export class SpotifyUserLibraryService extends SpotifyHttpClient {
  private static instance: SpotifyUserLibraryService | null = null;
  private static syncInstance: SpotifyUserLibraryService | null = null;
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly playlistAccessCache = new Map<string, PlaylistAccessCacheEntry>();
  private playlistAccessProbeCooldownUntil = 0;
  private readonly inFlightPromises = new PromiseCache({ ttlMs: 30_000 });

  private constructor(
    private readonly settingsService: SettingsService,
    authService: SpotifyAuthService,
    limiterMode: "user" | "sync" = "user",
  ) {
    super(authService, limiterMode);
  }

  static getInstance(
    settingsService?: SettingsService,
    authService?: SpotifyAuthService,
    limiterMode: "user" | "sync" = "user",
  ): SpotifyUserLibraryService {
    const instanceKey = limiterMode === "sync" ? "syncInstance" : "instance";

    if (!SpotifyUserLibraryService[instanceKey]) {
      if (!settingsService || !authService) {
        throw new AppError(
          500,
          "internal_server_error",
          "SettingsService and SpotifyAuthService must be provided when initializing SpotifyUserLibraryService",
        );
      }
      SpotifyUserLibraryService[instanceKey] = new SpotifyUserLibraryService(
        settingsService,
        authService,
        limiterMode,
      );
    }
    return SpotifyUserLibraryService[instanceKey] as SpotifyUserLibraryService;
  }

  static clearGlobalCache(): void {
    SpotifyUserLibraryService.instance?.clearCache();
    SpotifyUserLibraryService.syncInstance?.clearCache();
  }

  private getCacheKey(method: string, ...args: unknown[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const cacheMinutes = await this.settingsService.getNumber("RELEASES_CACHE_MINUTES");
    const cacheTTL = cacheMinutes * 60 * 1000;

    const now = Date.now();
    if (now - entry.createdAt > cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      value: data,
      createdAt: Date.now(),
      ttlMs: 0,
    });
  }

  clearCache(): void {
    this.cache.clear();
    this.playlistAccessCache.clear();
    this.playlistAccessProbeCooldownUntil = 0;
    this.inFlightPromises.clear();
    this.log("Cache cleared");
  }

  private getPlaylistAccessCache(playlistId: string): PlaylistAccessResult | null {
    const entry = this.playlistAccessCache.get(playlistId);
    if (!entry) return null;

    if (Date.now() >= entry.expiresAt) {
      this.playlistAccessCache.delete(playlistId);
      return null;
    }

    return { status: entry.status, trackTotal: entry.trackTotal };
  }

  private setPlaylistAccessCache(
    playlistId: string,
    status: Exclude<PlaylistAccessStatus, "rate_limited">,
    trackTotal?: number,
  ): void {
    const ttlMs =
      status === "allowed" ? PLAYLIST_ACCESS_ALLOWED_TTL_MS : PLAYLIST_ACCESS_DENIED_TTL_MS;
    this.playlistAccessCache.set(playlistId, {
      status,
      trackTotal,
      expiresAt: Date.now() + ttlMs,
    });

    this.prunePlaylistAccessCache();
  }

  private prunePlaylistAccessCache(): void {
    const now = Date.now();
    for (const [playlistId, entry] of this.playlistAccessCache) {
      if (now >= entry.expiresAt) {
        this.playlistAccessCache.delete(playlistId);
      }
    }

    while (this.playlistAccessCache.size > PLAYLIST_ACCESS_CACHE_MAX_ENTRIES) {
      const oldestKey = this.playlistAccessCache.keys().next().value;
      if (!oldestKey) break;
      this.playlistAccessCache.delete(oldestKey);
    }
  }

  private getRetryAfterMs(response: Response): number {
    const retryAfter = response.headers.get("Retry-After");
    if (!retryAfter) return PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS;

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }

    const retryAt = Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.max(retryAt - Date.now(), PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS);
    }

    return PLAYLIST_ACCESS_RATE_LIMIT_FALLBACK_COOLDOWN_MS;
  }

  private isPlaylistAccessProbeCoolingDown(): boolean {
    return Date.now() < this.playlistAccessProbeCooldownUntil;
  }

  private async getFollowedArtistsSnapshot(maxArtists: number): Promise<SpotifyArtistFull[]> {
    const cacheKey = this.getCacheKey(FOLLOWED_ARTISTS_CACHE_KEY, maxArtists);
    const cached = await this.getFromCache<SpotifyArtistFull[]>(cacheKey);

    if (cached) {
      return cached;
    }

    return this.inFlightPromises.getOrSet(
      `${FOLLOWED_ARTISTS_IN_FLIGHT_KEY}:${maxArtists}`,
      async () => {
        const warmCache = await this.getFromCache<SpotifyArtistFull[]>(cacheKey);
        if (warmCache) {
          return warmCache;
        }

        const artists = await this.fetchAllFollowedArtists(maxArtists);
        const slicedArtists = artists.slice(0, maxArtists);
        this.setCache(cacheKey, slicedArtists);
        return slicedArtists;
      },
    );
  }

  private log(message: string, level: "debug" | "error" | "warn" = "debug") {
    const prefix = `[SpotifyUserLibraryService]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }

  private async getMarket(): Promise<string> {
    try {
      return await this.settingsService.getString("SPOTIFY_MARKET");
    } catch {
      return "ES";
    }
  }

  private async getCurrentUserId(): Promise<string> {
    const response = await this.fetchWithUserToken("https://api.spotify.com/v1/me");

    if (!response.ok) {
      if (response.status === 401) {
        throw new AppError(
          401,
          "missing_user_access_token",
          "Reconnect Spotify to grant the required playlist scopes.",
        );
      }

      if (response.status === 403) {
        throw new AppError(
          401,
          "missing_user_access_token",
          "Reconnect Spotify to grant the user-read-private scope.",
        );
      }

      const errorText = await response.text();
      throw new AppError(
        response.status,
        "internal_server_error",
        `Failed to fetch current Spotify user: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as SpotifyCurrentUserResponse;
    return data.id;
  }

  private async canAccessPlaylistItems(playlistId: string): Promise<PlaylistAccessResult> {
    const cached = this.getPlaylistAccessCache(playlistId);
    if (cached) {
      return cached;
    }

    if (this.isPlaylistAccessProbeCoolingDown()) {
      return { status: "rate_limited" };
    }

    const fields = "total";
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=1&fields=${encodeURIComponent(fields)}`;
    const response = await this.fetchWithUserToken(url);

    if (response.ok) {
      const data = (await response.json()) as { total?: unknown };
      const trackTotal =
        typeof data.total === "number" && Number.isFinite(data.total) ? data.total : undefined;
      this.setPlaylistAccessCache(playlistId, "allowed", trackTotal);
      return { status: "allowed", trackTotal };
    }

    if (response.status === 403 || response.status === 404) {
      this.setPlaylistAccessCache(playlistId, "denied");
      return { status: "denied" };
    }

    if (response.status === 401) {
      throw new AppError(
        401,
        "missing_user_access_token",
        "Reconnect Spotify to grant the required playlist scopes.",
      );
    }

    if (response.status === 429) {
      const cooldownMs = this.getRetryAfterMs(response);
      this.playlistAccessProbeCooldownUntil = Date.now() + cooldownMs;
      this.log(
        `Spotify rate limited playlist access probes; cooling down for ${cooldownMs}ms`,
        "warn",
      );
      return { status: "rate_limited" };
    }

    const errorText = await response.text();
    throw new AppError(
      response.status >= 500 ? 502 : 500,
      "internal_server_error",
      `Failed to check playlist item access: ${response.status} ${errorText}`,
    );
  }

  private async getPlaylistVisibility(
    item: SpotifyUserPlaylistItem,
    currentUserId: string,
  ): Promise<PlaylistAccessResult> {
    if (isOwnedPlaylist(item, currentUserId)) {
      return { status: "allowed" };
    }

    return this.canAccessPlaylistItems(item.id);
  }

  async getMyPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      this.log("Getting user's playlists from Spotify");
      const currentUserId = await this.getCurrentUserId();
      const allPlaylists: SpotifyPlaylist[] = [];

      let nextUrl: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";

      while (nextUrl) {
        const response: Response = await this.fetchWithUserToken(nextUrl);

        if (!response.ok) {
          if (response.status === 401) {
            throw new AppError(
              401,
              "missing_user_access_token",
              "Reconnect Spotify to grant the required playlist scopes.",
            );
          }

          if (response.status === 403) {
            throw new AppError(
              401,
              "missing_user_access_token",
              "Reconnect Spotify to grant the user-read-private and playlist-read-private scopes.",
            );
          }

          const errorText = await response.text();
          throw new AppError(
            response.status,
            "internal_server_error",
            `Failed to fetch user playlists: ${response.status} ${errorText}`,
          );
        }

        const data = (await response.json()) as {
          items: SpotifyUserPlaylistItem[];
          next: string | null;
        };

        const accessibleItems: { item: SpotifyUserPlaylistItem; trackTotal?: number }[] = [];

        for (const item of data.items) {
          const visibility = await this.getPlaylistVisibility(item, currentUserId);
          if (visibility.status === "allowed") {
            accessibleItems.push({ item, trackTotal: visibility.trackTotal });
          }
        }

        const mapped = accessibleItems.map(({ item, trackTotal }) => {
          const playlistTrackTotal = item.tracks?.total;
          const tracks =
            typeof playlistTrackTotal === "number" && Number.isFinite(playlistTrackTotal)
              ? playlistTrackTotal
              : (trackTotal ?? 0);

          return {
            id: item.id,
            name: item.name,
            image: item.images?.[0]?.url ?? null,
            owner: item.owner?.display_name ?? "Unknown",
            tracks,
            spotifyUrl: item.external_urls?.spotify,
            ownerUrl: item.owner?.external_urls?.spotify,
          };
        });

        allPlaylists.push(...mapped);
        nextUrl = data.next;
      }

      return allPlaylists;
    } catch (error) {
      this.log(`Failed to get user playlists: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async getArtistCatalogData(
    artists: { id: string; name: string; imageUrl?: string | null }[],
    earlyStopBeforeDate?: Date,
  ): Promise<ArtistRelease[]> {
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

          this.log(
            `Failed to fetch catalog for artist ${artist.id}: ${albumsResponse.status} ${errorText}`,
            "warn",
          );
          break;
        }

        const albumsData = (await albumsResponse.json()) as SpotifyArtistAlbumsResponse;
        const pageAlbums = albumsData.items ?? [];

        if (pageAlbums.length === 0) {
          break;
        }

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
          if (oldestOnPage.releaseDate) {
            const parts = oldestOnPage.releaseDate.split("-");
            const year = Number(parts[0]);
            const month = parts.length >= 2 ? Number(parts[1]) - 1 : 0;
            const day = parts.length >= 3 ? Number(parts[2]) : 1;
            if (!Number.isNaN(year) && year > 0) {
              const oldestDate = new Date(year, month, day);
              if (oldestDate < earlyStopBeforeDate) {
                shouldStop = true;
              }
            }
          }
        }

        if (pageAlbums.length < SPOTIFY_ARTIST_ALBUMS_MAX_LIMIT) {
          break;
        }

        offset += pageAlbums.length;
      }

      albumsPerArtist.push(albums);
    }

    return albumsPerArtist.flat();
  }

  async getFollowedArtists(): Promise<FollowedArtist[]> {
    const cacheKey = this.getCacheKey("getFollowedArtists");
    const cached = await this.getFromCache<FollowedArtist[]>(cacheKey);
    if (cached) {
      this.log("Returning cached followed artists list");
      return cached;
    }

    try {
      const maxArtists = await this.settingsService.getNumber("FOLLOWED_ARTISTS_MAX");
      const artists = await this.getFollowedArtistsSnapshot(maxArtists);

      const sliced = artists.slice(0, maxArtists);

      const sorted = sliced.sort((a, b) => a.name.localeCompare(b.name));

      const mapped = sorted.map((artist) => ({
        id: artist.id,
        name: artist.name,
        image: artist.images?.[0]?.url ?? null,
        spotifyUrl: artist.external_urls?.spotify ?? null,
      }));

      this.setCache(cacheKey, mapped);
      return mapped;
    } catch (error) {
      this.log(`Failed to get followed artists list: ${getErrorMessage(error)}`);
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
      if (after) {
        url.searchParams.set("after", after);
      }

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
      const pageArtists = data.artists?.items ?? [];
      artists.push(...pageArtists);
      after = data.artists?.cursors?.after;

      if (artists.length >= maxArtists) {
        break;
      }
    } while (after);

    return artists;
  }
}
