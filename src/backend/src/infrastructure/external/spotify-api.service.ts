import { AlbumType, ArtistRelease } from "@spotiarr/shared";
import { SettingsService } from "../../application/services/settings.service";
import { SpotifyUrlHelper } from "../../domain/helpers/spotify-url.helper";
import { NormalizedTrack } from "../../types/spotify";
import { getEnv } from "../setup/environment";

interface SpotifyExternalUrls {
  spotify?: string;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyArtist {
  id?: string;
  name: string;
  external_urls?: SpotifyExternalUrls;
}

interface SpotifyAlbum {
  name: string;
  images?: SpotifyImage[];
  release_date?: string;
  id?: string;
  album_group?: string;
  album_type?: string;
  external_urls?: SpotifyExternalUrls;
  artists?: SpotifyArtist[];
  total_tracks?: number;
}

interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  album?: SpotifyAlbum;
  preview_url?: string | null;
  external_urls?: SpotifyExternalUrls;
  track_number?: number;
  duration_ms?: number;
}

interface SpotifyAlbumTracksResponse {
  items: SpotifyTrack[];
}

interface SpotifyPlaylistTrackItem {
  track: SpotifyTrack | null;
}

interface SpotifyArtistTopTracksResponse {
  tracks?: SpotifyTrack[];
}

interface SpotifyCursor {
  after?: string;
}

interface SpotifyFollowedArtistsPage {
  items: SpotifyArtistFull[];
  next?: string | null;
  cursors?: SpotifyCursor;
}

interface SpotifyFollowedArtistsResponse {
  artists: SpotifyFollowedArtistsPage;
}

interface SpotifyArtistFull extends SpotifyArtist {
  id: string;
  images?: SpotifyImage[];
}

interface SpotifyArtistAlbumsResponse {
  items: SpotifyAlbum[];
}

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const FOLLOWED_ARTISTS_MAX_KEY = "FOLLOWED_ARTISTS_MAX";

export class SpotifyApiService {
  private static instance: SpotifyApiService | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly settingsService: SettingsService;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  private constructor() {
    this.settingsService = new SettingsService();
  }

  static getInstance(): SpotifyApiService {
    if (!SpotifyApiService.instance) {
      SpotifyApiService.instance = new SpotifyApiService();
    }
    return SpotifyApiService.instance;
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
    const prefix = `[SpotifyApiService]`;
    if (level === "error") console.error(prefix, message);
    else if (level === "warn") console.warn(prefix, message);
    else if (getEnv().NODE_ENV === "development") console.log(prefix, message);
  }

  async getPlaylistMetadata(spotifyUrl: string): Promise<{ name: string; image: string }> {
    try {
      this.log(`Getting playlist metadata for ${spotifyUrl}`);

      const playlistId = SpotifyUrlHelper.extractId(spotifyUrl);
      const url = `https://api.spotify.com/v1/playlists/${playlistId}?market=US`;

      // Try with app token first
      let response = await this.fetchWithAppToken(url);

      // If we get a 404, try with user token (some playlists require user auth)
      if (response.status === 404) {
        this.log(`Playlist not accessible with app token, trying user token...`, "warn");
        try {
          response = await this.fetchWithUserToken(url);
        } catch (userTokenError) {
          // If user token is not available, throw a more helpful error
          if ((userTokenError as Error & { code?: string }).code === "MISSING_SPOTIFY_USER_TOKEN") {
            throw new Error(
              `This playlist requires user authentication. Please configure your Spotify user access token in Settings or set SPOTIFY_USER_ACCESS_TOKEN in your .env file. Playlist ID: ${playlistId}`,
            );
          }
          throw userTokenError;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();

        // Provide more helpful error messages
        if (response.status === 404) {
          throw new Error(
            `Playlist not found or not accessible. This may be a private playlist or a region-restricted playlist. Playlist ID: ${playlistId}`,
          );
        }

        throw new Error(`Failed to get playlist metadata: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as { name: string; images?: SpotifyImage[] };

      return {
        name: data.name,
        image: data.images?.[0]?.url ?? "",
      };
    } catch (error) {
      this.log(`Failed to get playlist metadata: ${(error as Error).message}`, "error");
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      this.log("Getting new Spotify access token");

      const env = getEnv();
      const clientId = env.SPOTIFY_CLIENT_ID;
      const clientSecret = env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          "Missing Spotify credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file",
        );
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to get access token: ${errorData}`);
      }

      const data = (await response.json()) as SpotifyTokenResponse;
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;

      this.log("Successfully obtained Spotify access token");
      return this.accessToken as string;
    } catch (error) {
      this.log(`Error getting Spotify access token: ${(error as Error).message}`);
      throw error;
    }
  }

  private async getUserAccessToken(): Promise<string> {
    const accessTokenKey = "spotify_user_access_token";
    let fromSettings: string | undefined;

    try {
      fromSettings = await this.settingsService.getString(accessTokenKey);
    } catch {
      fromSettings = undefined;
    }

    const token = fromSettings ?? getEnv().SPOTIFY_USER_ACCESS_TOKEN;

    if (!token) {
      const error = new Error(
        `Missing Spotify user access token. Set '${accessTokenKey}' in settings or SPOTIFY_USER_ACCESS_TOKEN in env`,
      ) as Error & { code?: string };
      error.code = "MISSING_SPOTIFY_USER_TOKEN";
      throw error;
    }

    return token;
  }

  /**
   * Perform a fetch using the Spotify application access token.
   */
  private async fetchWithAppToken(input: string | URL, init?: RequestInit): Promise<Response> {
    const token = await this.getAccessToken();
    const headers = {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    } as Record<string, string>;

    return fetch(input.toString(), {
      ...init,
      headers,
    });
  }

  /**
   * Try to refresh the Spotify user access token using the stored refresh token.
   * Returns true if a new access token was obtained and stored, false otherwise.
   */
  private async tryRefreshUserToken(): Promise<boolean> {
    try {
      const refreshTokenKey = "spotify_user_refresh_token";
      const accessTokenKey = "spotify_user_access_token";

      const refreshToken = await this.settingsService.getString(refreshTokenKey);
      if (!refreshToken) {
        this.log("No Spotify user refresh token available to refresh access token", "warn");
        return false;
      }

      const env = getEnv();
      const clientId = env.SPOTIFY_CLIENT_ID;
      const clientSecret = env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        this.log(
          "Missing Spotify client credentials for user token refresh. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
          "warn",
        );
        return false;
      }

      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.log(`Failed to refresh Spotify user token: ${response.status} ${errorText}`, "warn");
        return false;
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };

      await this.settingsService.setString(accessTokenKey, data.access_token);

      if (data.refresh_token) {
        await this.settingsService.setString(refreshTokenKey, data.refresh_token);
      }

      this.log("Successfully refreshed Spotify user access token");
      return true;
    } catch (error) {
      this.log(`Error refreshing Spotify user token: ${(error as Error).message}`, "warn");
      return false;
    }
  }

  /**
   * Perform a fetch using the Spotify user access token, automatically
   * attempting a single refresh on 401 responses.
   */
  private async fetchWithUserToken(input: string | URL, init?: RequestInit): Promise<Response> {
    const makeRequest = async (token: string): Promise<Response> => {
      const headers = {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      } as Record<string, string>;

      return fetch(input.toString(), {
        ...init,
        headers,
      });
    };

    // First attempt with current token
    const initialToken = await this.getUserAccessToken();
    const response = await makeRequest(initialToken);

    if (response.status !== 401) {
      return response;
    }

    // Try to refresh the token once
    const refreshed = await this.tryRefreshUserToken();
    if (!refreshed) {
      return response;
    }

    // Retry with new token
    const newToken = await this.getUserAccessToken();
    return makeRequest(newToken);
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
      this.log(`Failed to fetch artist data: ${(error as Error).message}`);
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
      this.log(`Failed to get artist image: ${(error as Error).message}`);
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
      this.log(`Failed to get artist details: ${(error as Error).message}`);
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
        throw new Error(`Failed to fetch track: ${response.status}`);
      }

      const track = (await response.json()) as SpotifyTrack;

      // Get artist image
      const artistId = track.artists[0]?.id;
      const artistImage = artistId ? await this.getArtistImage(artistId) : null;

      // Album cover image
      const albumCoverUrl = track.album?.images?.[0]?.url;

      // Extract year from release_date (format: "YYYY-MM-DD" or "YYYY")
      const releaseDate = track.album?.release_date;
      const albumYear = releaseDate ? parseInt(releaseDate.substring(0, 4)) : undefined;

      return {
        name: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        primaryArtist: track.artists[0]?.name, // First artist as primary
        primaryArtistImage: artistImage, // Artist image
        artists: track.artists.map((a) => ({
          name: a.name,
          url: a.external_urls?.spotify,
        })),
        trackUrl: track.external_urls?.spotify,
        album: track.album?.name,
        albumUrl: track.album?.external_urls?.spotify,
        albumCoverUrl,
        albumYear: albumYear, // Year of the album
        trackNumber: track.track_number,
        previewUrl: track.preview_url,
        durationMs: track.duration_ms,
      };
    } catch (error) {
      this.log(`Failed to get track details: ${(error as Error).message}`);
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
        throw new Error(`Failed to fetch album: ${response.status}`);
      }

      const data = (await response.json()) as SpotifyAlbumTracksResponse;
      const albumResponse = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/albums/${albumId}`,
      );

      const albumData = (await albumResponse.json()) as SpotifyAlbum;
      const albumName = albumData.name;
      const albumCoverUrl = albumData.images?.[0]?.url;
      const albumUrl = albumData.external_urls?.spotify;

      // Get artist image (all tracks in album have same primary artist)
      const firstArtistId = data.items[0]?.artists[0]?.id;
      const artistImage = firstArtistId ? await this.getArtistImage(firstArtistId) : null;

      // Extract year from release_date
      const releaseDate = albumData.release_date;
      const albumYear = releaseDate ? parseInt(releaseDate.substring(0, 4)) : undefined;

      return data.items.map((track: SpotifyTrack) => ({
        name: track.name,
        artist: track.artists.map((a: SpotifyArtist) => a.name).join(", "),
        primaryArtist: track.artists[0]?.name, // First artist as primary
        primaryArtistImage: artistImage, // Artist image
        artists: track.artists.map((a: SpotifyArtist) => ({
          name: a.name,
          url: a.external_urls?.spotify,
        })),
        trackUrl: track.external_urls?.spotify,
        album: albumName,
        albumUrl,
        albumCoverUrl,
        albumYear: albumYear, // Year of the album
        trackNumber: track.track_number,
        previewUrl: track.preview_url,
        durationMs: track.duration_ms,
      }));
    } catch (error) {
      this.log(`Failed to get album tracks: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get top tracks for an artist from Spotify API
   */
  async getArtistTopTracks(
    artistId: string,
    market: string = "US",
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
      const response = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch artist top tracks: ${response.status}`);
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
        tracks.map(async (track, index: number) => {
          const primaryArtistId = track.artists?.[0]?.id as string | undefined;
          const primaryArtistImage = await getPrimaryArtistImage(primaryArtistId);

          const releaseDate = track.album?.release_date;
          const albumYear = releaseDate ? parseInt(releaseDate.substring(0, 4)) : undefined;

          const albumCoverUrl = track.album?.images?.[0]?.url;

          return {
            name: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
            primaryArtist: track.artists[0]?.name,
            primaryArtistImage,
            artists: track.artists.map((a) => ({
              name: a.name,
              url: a.external_urls?.spotify,
            })),
            trackUrl: track.external_urls?.spotify,
            album: track.album?.name,
            albumCoverUrl,
            albumYear,
            trackNumber: track.track_number ?? index + 1,
            previewUrl: track.preview_url,
            durationMs: track.duration_ms,
          };
        }),
      );

      return mappedTracks;
    } catch (error) {
      this.log(`Failed to get artist top tracks: ${(error as Error).message}`);
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
        const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=${fetchLimit}&offset=${currentOffset}&market=US`;

        const response = await this.fetchWithAppToken(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch artist albums: ${response.status}`);
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
      this.log(`Failed to get artist albums: ${(error as Error).message}`);
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
      const artists: SpotifyArtistFull[] = [];
      let after: string | undefined;
      const maxArtists = await this.settingsService.getNumber(FOLLOWED_ARTISTS_MAX_KEY);
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
            const tokenError = new Error("Spotify user token expired or invalid") as Error & {
              code?: string;
            };
            tokenError.code = "MISSING_SPOTIFY_USER_TOKEN";
            throw tokenError;
          }

          if (response.status === 429) {
            const rateError = new Error(
              `Spotify rate limit exceeded while fetching followed artists: ${errorText}`,
            ) as Error & { code?: string; status?: number };
            rateError.code = "SPOTIFY_RATE_LIMITED";
            rateError.status = 429;
            throw rateError;
          }

          throw new Error(`Failed to fetch followed artists: ${response.status} ${errorText}`);
        }

        const data = (await response.json()) as SpotifyFollowedArtistsResponse;
        const pageArtists = data.artists?.items ?? [];
        artists.push(...pageArtists);
        after = data.artists?.cursors?.after;

        if (artists.length >= maxArtists) {
          break;
        }
      } while (after);

      const releasesPerArtist = await Promise.all(
        artists.slice(0, maxArtists).map(async (artist) => {
          const albumsUrl = `https://api.spotify.com/v1/artists/${artist.id}/albums?include_groups=album,single&limit=10`;
          const albumsResponse = await this.fetchWithUserToken(albumsUrl);

          if (!albumsResponse.ok) {
            const errorText = await albumsResponse.text();

            if (albumsResponse.status === 401) {
              const tokenError = new Error("Spotify user token expired or invalid") as Error & {
                code?: string;
              };
              tokenError.code = "MISSING_SPOTIFY_USER_TOKEN";
              throw tokenError;
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
      this.log(`Failed to get followed artists releases: ${(error as Error).message}`);
      throw error;
    }
  }

  async getFollowedArtists(): Promise<
    {
      id: string;
      name: string;
      image: string | null;
      spotifyUrl: string | null;
    }[]
  > {
    const cacheKey = this.getCacheKey("getFollowedArtists");
    const cached = await this.getFromCache<
      {
        id: string;
        name: string;
        image: string | null;
        spotifyUrl: string | null;
      }[]
    >(cacheKey);
    if (cached) {
      this.log("Returning cached followed artists list");
      return cached;
    }

    try {
      const artists: SpotifyArtistFull[] = [];
      let after: string | undefined;
      const maxArtists = await this.settingsService.getNumber("FOLLOWED_ARTISTS_MAX");
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
            const tokenError = new Error("Spotify user token expired or invalid") as Error & {
              code?: string;
            };
            tokenError.code = "MISSING_SPOTIFY_USER_TOKEN";
            throw tokenError;
          }

          if (response.status === 429) {
            const rateError = new Error(
              `Spotify rate limit exceeded while fetching followed artists: ${errorText}`,
            ) as Error & { code?: string; status?: number };
            rateError.code = "SPOTIFY_RATE_LIMITED";
            rateError.status = 429;
            throw rateError;
          }

          throw new Error(`Failed to fetch followed artists: ${response.status} ${errorText}`);
        }

        const data = (await response.json()) as SpotifyFollowedArtistsResponse;
        const pageArtists = data.artists?.items ?? [];
        artists.push(...pageArtists);
        after = data.artists?.cursors?.after;

        if (artists.length >= maxArtists) {
          break;
        }
      } while (after);

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
      this.log(`Failed to get followed artists list: ${(error as Error).message}`);
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
          artists: track.artists.map((a) => ({
            name: a.name,
            url: a.url,
          })),
          trackUrl: track.trackUrl,
          album: track.album,
          albumUrl: track.albumUrl,
          albumYear: track.albumYear,
          trackNumber: track.trackNumber,
          previewUrl: track.previewUrl ?? null,
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

          const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${offset}&limit=100&market=US&fields=items(track(name,artists(name,external_urls),preview_url,external_urls,album(name,release_date,images,external_urls),track_number,duration_ms)),next`;

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
                  (userTokenError as Error & { code?: string }).code ===
                  "MISSING_SPOTIFY_USER_TOKEN"
                ) {
                  throw new Error(
                    `This playlist requires user authentication. Please configure your Spotify user access token in Settings or set SPOTIFY_USER_ACCESS_TOKEN in your .env file. Playlist ID: ${playlistId}`,
                  );
                }
                throw userTokenError;
              }
            }
          }

          if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 404) {
              throw new Error(
                `Playlist not found or not accessible. This may be a private playlist or a region-restricted playlist. Playlist ID: ${playlistId}`,
              );
            }

            this.log(`Spotify API error: ${response.status} ${errorText}`);
            throw new Error(`Failed to fetch tracks: ${response.status}`);
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

              const albumYear = item.track.album?.release_date
                ? parseInt(item.track.album.release_date.substring(0, 4))
                : undefined;

              return {
                name: item.track.name,
                artist: item.track.artists.map((a) => a.name).join(", "),
                artists: item.track.artists.map((a) => ({
                  name: a.name,
                  url: a.external_urls?.spotify,
                })),
                trackUrl: item.track.external_urls?.spotify,
                album: item.track.album?.name,
                albumUrl: item.track.album?.external_urls?.spotify,
                albumCoverUrl: item.track.album?.images?.[0]?.url,
                albumYear: albumYear,
                trackNumber: item.track.track_number,
                previewUrl: item.track.preview_url,
                durationMs: item.track.duration_ms,
              };
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
      this.log(`Failed to get all playlist tracks: ${(error as Error).message}`);
      throw error;
    }
  }
}
