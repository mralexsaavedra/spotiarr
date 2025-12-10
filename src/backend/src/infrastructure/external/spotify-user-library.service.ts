import { AlbumType, ArtistRelease, FollowedArtist, SpotifyPlaylist } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getEnv } from "../setup/environment";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient } from "./spotify-http.client";
import {
  SpotifyArtistAlbumsResponse,
  SpotifyArtistFull,
  SpotifyFollowedArtistsResponse,
  SpotifyImage,
} from "./spotify.types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const FOLLOWED_ARTISTS_MAX_KEY = "FOLLOWED_ARTISTS_MAX";

export class SpotifyUserLibraryService extends SpotifyHttpClient {
  private static instance: SpotifyUserLibraryService | null = null;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  private constructor(
    private readonly settingsService: SettingsService,
    authService: SpotifyAuthService,
  ) {
    super(authService);
  }

  static getInstance(
    settingsService?: SettingsService,
    authService?: SpotifyAuthService,
  ): SpotifyUserLibraryService {
    if (!SpotifyUserLibraryService.instance) {
      if (!settingsService || !authService) {
        throw new AppError(
          500,
          "internal_server_error",
          "SettingsService and SpotifyAuthService must be provided when initializing SpotifyUserLibraryService",
        );
      }
      SpotifyUserLibraryService.instance = new SpotifyUserLibraryService(
        settingsService,
        authService,
      );
    }
    return SpotifyUserLibraryService.instance;
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
    if (now - entry.timestamp > cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache(): void {
    this.cache.clear();
    this.log("Cache cleared");
  }

  private log(message: string, level: "debug" | "error" | "warn" = "debug") {
    const prefix = `[SpotifyUserLibraryService]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }

  async getMyPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      this.log("Getting user's playlists from Spotify");
      const allPlaylists: SpotifyPlaylist[] = [];

      let nextUrl: string | null = "https://api.spotify.com/v1/me/playlists?limit=50";

      while (nextUrl) {
        const response: Response = await this.fetchWithUserToken(nextUrl);

        if (!response.ok) {
          if (response.status === 401) {
            throw new AppError(
              401,
              "missing_user_access_token",
              "Spotify user token expired or invalid",
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
          items: {
            id: string;
            name: string;
            images: SpotifyImage[];
            owner: { display_name: string; external_urls: { spotify: string } };
            tracks: { total: number };
            external_urls: { spotify: string };
          }[];
          next: string | null;
        };

        const mapped = data.items.map((item) => ({
          id: item.id,
          name: item.name,
          image: item.images?.[0]?.url ?? null,
          owner: item.owner?.display_name ?? "Unknown",
          tracks: item.tracks?.total ?? 0,
          spotifyUrl: item.external_urls?.spotify,
          ownerUrl: item.owner?.external_urls?.spotify,
        }));

        allPlaylists.push(...mapped);
        nextUrl = data.next;
      }

      return allPlaylists;
    } catch (error) {
      this.log(`Failed to get user playlists: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async getFollowedArtistsRecentReleases(): Promise<ArtistRelease[]> {
    const cacheKey = this.getCacheKey("getFollowedArtistsRecentReleases");
    const cached = await this.getFromCache<ArtistRelease[]>(cacheKey);
    if (cached) {
      this.log("Returning cached followed artists releases");
      return cached;
    }

    try {
      const maxArtists = await this.settingsService.getNumber(FOLLOWED_ARTISTS_MAX_KEY);
      const artists = await this.fetchAllFollowedArtists(maxArtists);

      const releasesPerArtist = await Promise.all(
        artists.slice(0, maxArtists).map(async (artist) => {
          const albumsUrl = `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&limit=10`;
          const albumsResponse = await this.fetchWithUserToken(albumsUrl);

          if (!albumsResponse.ok) {
            const errorText = await albumsResponse.text();

            if (albumsResponse.status === 401) {
              throw new AppError(
                401,
                "missing_user_access_token",
                "Spotify user token expired or invalid",
              );
            }

            this.log(
              `Failed to fetch albums for artist ${artist.id}: ${albumsResponse.status} ${errorText}`,
              "warn",
            );
            return [] as const;
          }

          const albumsData = (await albumsResponse.json()) as SpotifyArtistAlbumsResponse;
          const albums = albumsData.items ?? [];

          return albums.map((album) => ({
            artistId: artist.id,
            artistName: artist.name,
            artistImageUrl: artist.images?.[0]?.url ?? null,
            albumId: album.id as string,
            albumName: album.name,
            albumType: (album.album_group ?? album.album_type) as AlbumType,
            releaseDate: album.release_date,
            coverUrl: album.images?.[0]?.url ?? null,
            spotifyUrl: album.external_urls?.spotify,
          }));
        }),
      );

      const flat = releasesPerArtist.flat();

      const releasesLookbackDays = await this.settingsService.getNumber("RELEASES_LOOKBACK_DAYS");
      const safeLookbackDays = releasesLookbackDays > 0 ? releasesLookbackDays : 30;

      const now = new Date();
      const cutoff = new Date(now.getTime() - safeLookbackDays * 24 * 60 * 60 * 1000);

      const recent = flat.filter((item) => {
        if (!item.releaseDate) return false;

        // Spotify release_date can be YYYY, YYYY-MM, or YYYY-MM-DD
        const parts = item.releaseDate.split("-");
        const year = Number(parts[0]);
        let month = parts.length >= 2 ? Number(parts[1]) - 1 : 0; // 0-based month
        let day = parts.length >= 3 ? Number(parts[2]) : 1;

        if (Number.isNaN(year) || year <= 0) return false;
        if (Number.isNaN(month) || month < 0 || month > 11) month = 0;
        if (Number.isNaN(day) || day <= 0 || day > 31) day = 1;

        const releaseDate = new Date(year, month, day);
        return releaseDate >= cutoff;
      });

      recent.sort((a, b) => {
        const da = a.releaseDate ?? "";
        const db = b.releaseDate ?? "";
        return db.localeCompare(da);
      });

      // Cache the result
      this.setCache(cacheKey, recent);

      return recent;
    } catch (error) {
      this.log(`Failed to get followed artists releases: ${getErrorMessage(error)}`);
      throw error;
    }
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
      const artists = await this.fetchAllFollowedArtists(maxArtists);

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
