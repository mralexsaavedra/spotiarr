import { AlbumType, ArtistRelease, NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import {
  SpotifyArtistAlbumsResponse,
  SpotifyArtistTopTracksResponse,
  SpotifyExternalUrls,
  SpotifyImage,
  SpotifyTrack,
} from "./spotify.types";

export class SpotifyArtistClient extends SpotifyBaseClient {
  constructor(authService: SpotifyAuthService, settingsService: SettingsService) {
    super(authService, settingsService, "SpotifyArtistClient");
  }

  /**
   * Get artist metadata (including followers, genres, popularity) from Spotify API
   */
  async getArtistRaw(artistId: string): Promise<{
    name?: string;
    images?: SpotifyImage[];
    external_urls?: SpotifyExternalUrls;
    followers?: { total?: number };
    genres?: string[];
    popularity?: number;
  } | null> {
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
        followers?: { total?: number };
        genres?: string[];
        popularity?: number;
      };
    } catch (error) {
      this.log(`Failed to fetch artist data: ${getErrorMessage(error)}`);
      return null;
    }
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
    popularity: number | null;
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
          popularity: null,
          genres: [],
        };
      }

      return {
        name: artist.name,
        image: artist.images?.[0]?.url || null,
        spotifyUrl: artist.external_urls?.spotify || null,
        followers: artist.followers?.total ?? null,
        popularity: artist.popularity ?? null,
        genres: artist.genres ?? [],
      };
    } catch (error) {
      this.log(`Failed to get artist details: ${getErrorMessage(error)}`);
      return {
        name: "Unknown Artist",
        image: null,
        spotifyUrl: null,
        followers: null,
        popularity: null,
        genres: [],
      };
    }
  }

  /**
   * Get top tracks for an artist from Spotify API
   */
  async getArtistTopTracks(artistId: string, market?: string): Promise<NormalizedTrack[]> {
    try {
      const defaultMarket = await this.getMarket();
      const response = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market || defaultMarket}`,
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
        }
        throw new AppError(
          response.status,
          "internal_server_error",
          `Failed to fetch artist top tracks: ${response.status}`,
        );
      }

      const data = (await response.json()) as SpotifyArtistTopTracksResponse;
      const tracks: SpotifyTrack[] = data.tracks ?? [];

      // Build a cache of primary artist images to avoid duplicate API calls
      const artistImageCache: Record<string, string | null> = {};

      const getPrimaryArtistImage = async (
        primaryArtistId: string | undefined,
      ): Promise<string | null> => {
        if (!primaryArtistId) return null;
        if (primaryArtistId in artistImageCache) {
          return artistImageCache[primaryArtistId];
        }

        const image = await this.getArtistImage(primaryArtistId);
        artistImageCache[primaryArtistId] = image;
        return image;
      };

      const mappedTracks = await Promise.all(
        tracks.map(async (track, index) => {
          const primaryArtistId = track.artists?.[0]?.id as string | undefined;
          const primaryArtistImage = await getPrimaryArtistImage(primaryArtistId);

          const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
            primaryArtistImage,
          });

          return {
            ...normalized,
            trackNumber: normalized.trackNumber ?? index + 1,
          };
        }),
      );

      return mappedTracks;
    } catch (error) {
      this.log(`Failed to get artist top tracks: ${getErrorMessage(error)}`);
      throw error;
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
    try {
      const allAlbums: ArtistRelease[] = [];
      let currentOffset = offset;
      let remainingLimit = limit;
      const MAX_LIMIT_PER_REQUEST = 50;

      while (remainingLimit > 0) {
        const fetchLimit = Math.min(remainingLimit, MAX_LIMIT_PER_REQUEST);
        const market = await this.getMarket();
        const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=${fetchLimit}&offset=${currentOffset}&market=${market}`;

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

        const mappedAlbums = albums.map((album) => ({
          artistId: album.artists?.[0]?.id || artistId,
          artistName: album.artists?.[0]?.name || "Unknown Artist",
          artistImageUrl: null,
          albumId: album.id as string,
          albumName: album.name,
          albumType: (album.album_group ?? album.album_type) as AlbumType,
          releaseDate: album.release_date,
          coverUrl: album.images?.[0]?.url ?? null,
          spotifyUrl: album.external_urls?.spotify,
          totalTracks: album.total_tracks,
        }));

        allAlbums.push(...mappedAlbums);

        if (albums.length < fetchLimit) {
          break; // No more items available
        }

        currentOffset += albums.length;
        remainingLimit -= albums.length;
      }

      return allAlbums;
    } catch (error) {
      this.log(`Failed to get artist albums: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
