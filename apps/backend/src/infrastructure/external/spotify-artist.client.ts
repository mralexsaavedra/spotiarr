import { AlbumType, ArtistRelease } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { PromiseCache } from "./promise-cache";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import type { SpotifyLimiterMode } from "./spotify-http.client";
import { SpotifyArtistAlbumsResponse, SpotifyExternalUrls, SpotifyImage } from "./spotify.types";

function normalizeAlbumLimit(n: number): number {
  if (n <= 0) return 25;
  return Math.ceil(n / 25) * 25;
}

export class SpotifyArtistClient extends SpotifyBaseClient {
  private readonly requestCache = new PromiseCache({ ttlMs: 30_000 });
  private static readonly MAX_LIMIT_PER_REQUEST = 50;

  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    limiterMode: SpotifyLimiterMode = "interactive",
  ) {
    super(authService, settingsService, "SpotifyArtistClient", limiterMode);
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
   * Get artist image from Spotify API
   */
  async getArtistImage(artistId: string): Promise<string | null> {
    try {
      const artist = await this.getArtistRaw(artistId);
      if (!artist) return null;

      // Return the largest image available
      return artist.images?.[0]?.url || null;
    } catch (error) {
      this.log(`Failed to get artist image: ${getErrorMessage(error)}`);
      return null;
    }
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

  /**
   * Get all albums for an artist
   */
  async getArtistAlbums(
    artistId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ArtistRelease[]> {
    const market = await this.getMarket();
    const effectiveLimit = offset === 0 ? normalizeAlbumLimit(limit) : limit;
    const cacheKey = `artist-albums:${artistId}:${effectiveLimit}:${offset}:${market}`;

    return this.requestCache.getOrSet(cacheKey, async () => {
      try {
        if (effectiveLimit <= SpotifyArtistClient.MAX_LIMIT_PER_REQUEST) {
          return this.fetchArtistAlbumsPage(artistId, effectiveLimit, offset, market);
        }

        const allAlbums: ArtistRelease[] = [];
        let currentOffset = offset;
        let remainingLimit = effectiveLimit;

        while (remainingLimit > 0) {
          const fetchLimit = Math.min(remainingLimit, SpotifyArtistClient.MAX_LIMIT_PER_REQUEST);
          const mappedAlbums = await this.fetchArtistAlbumsPage(
            artistId,
            fetchLimit,
            currentOffset,
            market,
          );

          allAlbums.push(...mappedAlbums);

          if (mappedAlbums.length < fetchLimit) {
            break;
          }

          currentOffset += mappedAlbums.length;
          remainingLimit -= mappedAlbums.length;
        }

        return allAlbums;
      } catch (error) {
        this.log(`Failed to get artist albums: ${getErrorMessage(error)}`);
        throw error;
      }
    });
  }

  async getArtistAlbumsPaginated(
    artistId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ArtistRelease[]> {
    const market = await this.getMarket();
    const cacheKey = `artist-albums-page:${artistId}:${limit}:${offset}:${market}`;

    return this.requestCache.getOrSet(cacheKey, async () => {
      return this.fetchArtistAlbumsPage(
        artistId,
        Math.min(limit, SpotifyArtistClient.MAX_LIMIT_PER_REQUEST),
        offset,
        market,
      );
    });
  }

  private async fetchArtistAlbumsPage(
    artistId: string,
    limit: number,
    offset: number,
    market: string,
  ): Promise<ArtistRelease[]> {
    const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=${limit}&offset=${offset}&market=${market}`;
    const response = await this.fetchWithAppToken(url);

    if (!response.ok) {
      if (response.status === 429) {
        throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
      }

      throw new AppError(
        response.status,
        "internal_server_error",
        `Failed to fetch artist albums: ${response.status}`,
      );
    }

    const data = (await response.json()) as SpotifyArtistAlbumsResponse;
    const albums = data.items ?? [];

    return albums.map((album) => ({
      artistId: album.artists?.[0]?.id || artistId,
      artistName: album.artists?.[0]?.name || "Unknown Artist",
      artistImageUrl: null,
      albumId: album.id as string,
      albumName: album.name,
      albumType: album.album_type as AlbumType,
      releaseDate: album.release_date,
      coverUrl: album.images?.[0]?.url ?? null,
      spotifyUrl: album.external_urls?.spotify,
      totalTracks: album.total_tracks,
    }));
  }
}
