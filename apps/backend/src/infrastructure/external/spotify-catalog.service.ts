import { AlbumType, ArtistRelease, NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyUrlHelper } from "@/domain/helpers/spotify-url.helper";
import { getEnv } from "../setup/environment";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyHttpClient } from "./spotify-http.client";
import {
  SpotifyAlbum,
  SpotifyAlbumTracksResponse,
  SpotifyArtistAlbumsResponse,
  SpotifyArtistTopTracksResponse,
  SpotifyExternalUrls,
  SpotifyImage,
  SpotifyPlaylistTrackItem,
  SpotifyTrack,
} from "./spotify.types";

export class SpotifyCatalogService extends SpotifyHttpClient {
  private static instance: SpotifyCatalogService | null = null;

  private constructor(
    authService: SpotifyAuthService,
    private readonly settingsService: SettingsService,
  ) {
    super(authService);
  }

  static getInstance(
    authService?: SpotifyAuthService,
    settingsService?: SettingsService,
  ): SpotifyCatalogService {
    if (!SpotifyCatalogService.instance) {
      if (!authService || !settingsService) {
        throw new AppError(
          500,
          "internal_server_error",
          "SpotifyAuthService and SettingsService must be provided when initializing SpotifyCatalogService",
        );
      }
      SpotifyCatalogService.instance = new SpotifyCatalogService(authService, settingsService);
    }
    return SpotifyCatalogService.instance;
  }

  private async getMarket(): Promise<string> {
    try {
      return await this.settingsService.getString("SPOTIFY_MARKET");
    } catch {
      return "ES"; // Fallback to ES if setting not found
    }
  }

  private log(message: string, level: "debug" | "error" | "warn" = "debug") {
    const prefix = `[SpotifyCatalogService]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }

  async getPlaylistMetadata(
    spotifyUrl: string,
  ): Promise<{ name: string; image: string; owner: string; ownerUrl?: string }> {
    try {
      this.log(`Getting playlist metadata for ${spotifyUrl}`);

      const playlistId = SpotifyUrlHelper.extractId(spotifyUrl);
      const market = await this.getMarket();
      const url = `https://api.spotify.com/v1/playlists/${playlistId}?market=${market}`;

      // Try with app token first
      let response = await this.fetchWithAppToken(url);

      // If we get a 404, try with user token (some playlists require user auth)
      if (response.status === 404) {
        this.log(`Playlist not accessible with app token, trying user token...`, "warn");
        try {
          response = await this.fetchWithUserToken(url);
        } catch (userTokenError) {
          // If user token is not available, throw a more helpful error
          if (
            userTokenError instanceof AppError &&
            userTokenError.errorCode === "missing_user_access_token"
          ) {
            throw new AppError(
              401,
              "missing_user_access_token",
              `This playlist requires user authentication. Please login via the Web UI. Playlist ID: ${playlistId}`,
            );
          }
          throw userTokenError;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();

        // Provide more helpful error messages
        if (response.status === 404) {
          throw new AppError(
            404,
            "playlist_not_found",
            `Playlist not found or not accessible. This may be a private playlist or a region-restricted playlist. Playlist ID: ${playlistId}`,
          );
        }

        if (response.status === 429) {
          throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
        }

        throw new AppError(
          response.status >= 500 ? 502 : 500,
          "internal_server_error",
          `Failed to get playlist metadata: ${response.status} ${errorText}`,
        );
      }

      const data = (await response.json()) as {
        name: string;
        images?: SpotifyImage[];
        owner?: { display_name: string; external_urls?: { spotify: string } };
      };

      return {
        name: data.name,
        image: data.images?.[0]?.url ?? "",
        owner: data.owner?.display_name ?? "Unknown",
        ownerUrl: data.owner?.external_urls?.spotify,
      };
    } catch (error) {
      this.log(`Failed to get playlist metadata: ${getErrorMessage(error)}`, "error");
      throw error;
    }
  }

  /**
   * Get artist metadata (including followers, genres, popularity) from Spotify API
   */
  private async getArtistRaw(artistId: string): Promise<{
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

      const artist = (await response.json()) as {
        name?: string;
        images?: SpotifyImage[];
        external_urls?: SpotifyExternalUrls;
        followers?: { total?: number };
        genres?: string[];
        popularity?: number;
      };

      return artist;
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

  private mapToNormalizedTrack(
    track: SpotifyTrack,
    context?: {
      album?: SpotifyAlbum;
      albumCoverUrl?: string;
      primaryArtistImage?: string | null;
      isUnavailable?: boolean;
    },
  ) {
    // Album info resolution
    const album = context?.album ?? track.album;
    const albumName = album?.name;
    const albumUrl = album?.external_urls?.spotify;
    const albumCoverUrl = context?.albumCoverUrl ?? album?.images?.[0]?.url;

    // Release date parsing
    const releaseDate = album?.release_date;
    const albumYear = releaseDate ? parseInt(releaseDate.substring(0, 4)) : undefined;

    // Artist resolution
    const artistName = track.artists.map((a) => a.name).join(", ");
    const primaryArtist = track.artists[0]?.name;
    const artists = track.artists.map((a) => ({
      name: a.name,
      url: a.external_urls?.spotify,
    }));

    return {
      name: track.name,
      artist: artistName,
      primaryArtist,
      primaryArtistImage: context?.primaryArtistImage ?? null,
      artists,
      trackUrl: track.external_urls?.spotify,
      album: albumName,
      albumUrl,
      albumCoverUrl,
      albumYear,
      trackNumber: track.track_number,
      discNumber: track.disc_number,
      totalTracks: album?.total_tracks,
      previewUrl: track.preview_url,
      durationMs: track.duration_ms,
      unavailable: context?.isUnavailable ?? undefined,
    };
  }

  /**
   * Get track details from Spotify API for a single track
   */
  async getTrackDetails(trackId: string): Promise<{
    name: string;
    artist: string;
    primaryArtist: string | undefined;
    primaryArtistImage: string | null;
    artists: { name: string; url: string | undefined }[];
    trackUrl: string | undefined;
    album: string | undefined;
    albumUrl: string | undefined;
    albumCoverUrl: string | undefined;
    albumYear: number | undefined;
    trackNumber: number | undefined;
    previewUrl: string | null | undefined;
    durationMs: number | undefined;
  }> {
    try {
      const response = await this.fetchWithAppToken(`https://api.spotify.com/v1/tracks/${trackId}`);

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

      // Get artist image
      const artistId = track.artists[0]?.id;
      const artistImage = artistId ? await this.getArtistImage(artistId) : null;

      // Use the unified mapper
      const normalized = this.mapToNormalizedTrack(track, {
        primaryArtistImage: artistImage,
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
  }

  /**
   * Get album details from Spotify API
   */
  async getAlbumTracks(albumId: string): Promise<
    {
      name: string;
      artist: string;
      primaryArtist: string | undefined;
      primaryArtistImage: string | null;
      artists: { name: string; url: string | undefined }[];
      trackUrl: string | undefined;
      album: string;
      albumUrl: string | undefined;
      albumCoverUrl: string | undefined;
      albumYear: number | undefined;
      trackNumber: number | undefined;
      previewUrl: string | null | undefined;
      durationMs: number | undefined;
    }[]
  > {
    try {
      const response = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/albums/${albumId}/tracks`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new AppError(404, "playlist_not_found", `Album not found: ${albumId}`); // reusing playlist_not_found or we can add album_not_found
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
      const artistImage = firstArtistId ? await this.getArtistImage(firstArtistId) : null;

      return data.items.map((track: SpotifyTrack) => {
        const normalized = this.mapToNormalizedTrack(track, {
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

  /**
   * Get top tracks for an artist from Spotify API
   */
  async getArtistTopTracks(
    artistId: string,
    market?: string,
  ): Promise<
    {
      name: string;
      artist: string;
      primaryArtist: string | undefined;
      primaryArtistImage: string | null;
      artists: { name: string; url: string | undefined }[];
      trackUrl: string | undefined;
      album: string | undefined;
      albumCoverUrl: string | undefined;
      albumYear: number | undefined;
      trackNumber: number;
      previewUrl: string | null | undefined;
      durationMs: number | undefined;
    }[]
  > {
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

          const normalized = this.mapToNormalizedTrack(track, {
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

  async getAllPlaylistTracks(spotifyUrl: string): Promise<NormalizedTrack[]> {
    try {
      this.log(`Getting all tracks for ${spotifyUrl}`);

      // Check if this is a single track URL
      if (spotifyUrl.includes("/track/")) {
        const trackDetails = await this.getTrackDetails(spotifyUrl);
        return [trackDetails];
      }

      // For albums, reuse getAlbumTracks to keep album logic in one place
      if (spotifyUrl.includes("/album/")) {
        this.log("Album detected, using Spotify API");
        const albumId = SpotifyUrlHelper.extractId(spotifyUrl);
        const albumTracks = await this.getAlbumTracks(albumId);

        const normalized: NormalizedTrack[] = albumTracks.map((track) => ({
          name: track.name,
          artist: track.artist,
          artists: track.artists,
          trackUrl: track.trackUrl,
          album: track.album,
          albumUrl: track.albumUrl,
          albumYear: track.albumYear,
          trackNumber: track.trackNumber,
          previewUrl: track.previewUrl,
          albumCoverUrl: track.albumCoverUrl,
        }));

        this.log(`Retrieved ${normalized.length} album tracks via getAlbumTracks`);
        return normalized;
      }

      // For playlists, use Spotify API with pagination support
      if (spotifyUrl.includes("/playlist/")) {
        this.log("Playlist detected, using Spotify API");
        const playlistId = SpotifyUrlHelper.extractId(spotifyUrl);
        const allTracks: NormalizedTrack[] = [];
        let offset = 0;
        let hasMoreTracks = true;
        let useUserToken = false; // Track if we need to use user token

        while (hasMoreTracks) {
          this.log(`Fetching tracks from Spotify API with offset ${offset}`);

          const market = await this.getMarket();
          const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${offset}&limit=100&market=${market}&fields=items(track(name,artists(name,external_urls),preview_url,external_urls,album(name,release_date,images,external_urls),track_number,duration_ms,is_playable)),next`;

          let response: Response;

          // Use the appropriate token based on what worked before
          if (useUserToken) {
            response = await this.fetchWithUserToken(url);
          } else {
            // Try with app token first
            response = await this.fetchWithAppToken(url);

            // If we get a 404 on the first request, try with user token
            if (response.status === 404 && offset === 0) {
              this.log(`Playlist not accessible with app token, trying user token...`, "warn");
              try {
                response = await this.fetchWithUserToken(url);
                useUserToken = true; // Remember to use user token for subsequent pages
              } catch (userTokenError) {
                if (
                  userTokenError instanceof AppError &&
                  userTokenError.errorCode === "missing_user_access_token"
                ) {
                  throw new AppError(
                    401,
                    "missing_user_access_token",
                    `This playlist requires user authentication. Please login via the Web UI. Playlist ID: ${playlistId}`,
                  );
                }
                throw userTokenError;
              }
            }
          }

          if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 404) {
              throw new AppError(
                404,
                "playlist_not_found",
                `Playlist not found or not accessible. This may be a private playlist or a region-restricted playlist. Playlist ID: ${playlistId}`,
              );
            }

            if (response.status === 429) {
              throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
            }

            this.log(`Spotify API error: ${response.status} ${errorText}`);
            throw new AppError(
              response.status >= 500 ? 502 : 500,
              "internal_server_error",
              `Failed to fetch tracks: ${response.status}`,
            );
          }

          const data = (await response.json()) as {
            items?: SpotifyPlaylistTrackItem[];
          };

          if (!data.items || data.items.length === 0) {
            this.log("No more tracks to fetch from Spotify API");
            hasMoreTracks = false;
            continue;
          }

          const pageTracks = (data.items ?? [])
            .map((item: SpotifyPlaylistTrackItem) => {
              if (!item.track) return null;

              return this.mapToNormalizedTrack(item.track, {
                isUnavailable: item.track.is_playable === false,
              });
            })
            .filter((track: NormalizedTrack | null) => track !== null) as typeof allTracks;

          this.log(`Retrieved ${pageTracks.length} tracks from Spotify API at offset ${offset}`);

          if (pageTracks.length > 0) {
            allTracks.push(...pageTracks);
          }

          if (pageTracks.length < 100) {
            hasMoreTracks = false;
          } else {
            offset += 100;
          }
        }

        this.log(`Total tracks retrieved from Spotify API: ${allTracks.length}`);
        return allTracks;
      }

      // If we reach here, return empty array
      return [];
    } catch (error) {
      this.log(`Failed to get all playlist tracks: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
