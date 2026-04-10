import { AlbumType, SpotifySearchResults } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { PromiseCache } from "./promise-cache";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import type { SpotifyLimiterMode } from "./spotify-http.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyAlbum, SpotifyTrack } from "./spotify.types";

export class SpotifySearchClient extends SpotifyBaseClient {
  private readonly requestCache = new PromiseCache({ ttlMs: 30_000 });

  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    limiterMode: SpotifyLimiterMode = "interactive",
  ) {
    super(authService, settingsService, "SpotifySearchClient", limiterMode);
  }

  private async getArtistImagesBatch(artistIds: string[]): Promise<Record<string, string | null>> {
    const uniqueIds = Array.from(new Set(artistIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return {};
    }

    const MAX_ARTISTS_PER_REQUEST = 50;
    const imageMap: Record<string, string | null> = {};

    for (let index = 0; index < uniqueIds.length; index += MAX_ARTISTS_PER_REQUEST) {
      const chunk = uniqueIds.slice(index, index + MAX_ARTISTS_PER_REQUEST);
      const chunkKey = chunk.join(",");
      const response = await this.requestCache.getOrSet(
        `search-artist-image-batch:${chunkKey}`,
        () => this.fetchWithAppToken(`https://api.spotify.com/v1/artists?ids=${chunkKey}`),
      );

      if (!response.ok) {
        this.log(`Failed to fetch batched artist images: ${response.status}`, "warn");
        chunk.forEach((artistId) => {
          imageMap[artistId] = null;
        });
        continue;
      }

      const payload = (await response.json()) as {
        artists?: Array<{ id?: string; images?: Array<{ url: string }> }>;
      };

      const artists = payload.artists ?? [];

      chunk.forEach((artistId) => {
        imageMap[artistId] = null;
      });

      artists.forEach((artist) => {
        if (!artist.id) {
          return;
        }

        imageMap[artist.id] = artist.images?.[0]?.url ?? null;
      });
    }

    return imageMap;
  }

  async searchCatalog(
    query: string,
    types: string[] = ["track", "album", "artist"],
    limits: { track?: number; album?: number; artist?: number } = {},
  ): Promise<SpotifySearchResults> {
    try {
      if (!query || query.trim() === "") {
        return { tracks: [], albums: [], artists: [] };
      }

      this.log(`Searching catalog for query "${query}"`);

      const market = await this.getMarket();
      const encodedQuery = encodeURIComponent(query);

      const trackLimit = limits.track ?? 10;
      const albumLimit = limits.album ?? 10;
      const artistLimit = limits.artist ?? 5;

      const limitMap: Record<string, number> = {
        track: trackLimit,
        album: albumLimit,
        artist: artistLimit,
      };
      const groups: Record<number, string[]> = {};
      for (const type of types) {
        const lim = limitMap[type] ?? 10;
        if (!groups[lim]) groups[lim] = [];
        groups[lim].push(type);
      }

      const result: SpotifySearchResults = { tracks: [], albums: [], artists: [] };

      await Promise.all(
        Object.entries(groups).map(async ([limitStr, groupTypes]) => {
          const lim = Number(limitStr);
          const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=${groupTypes.join(",")}&limit=${lim}&market=${market}`;
          const response = await this.fetchWithAppToken(url);

          if (!response.ok) {
            if (response.status === 429) {
              throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
            }
            throw new AppError(
              response.status >= 500 ? 502 : 500,
              "internal_server_error",
              `Failed to search catalog: ${response.status}`,
            );
          }

          const data = (await response.json()) as {
            tracks?: { items: SpotifyTrack[] };
            albums?: { items: SpotifyAlbum[] };
            artists?: {
              items: {
                id: string;
                name: string;
                images?: { url: string }[];
                external_urls?: { spotify?: string };
              }[];
            };
          };

          if (data.tracks?.items) {
            const primaryArtistIds = data.tracks.items
              .map((track) => track.artists?.[0]?.id)
              .filter((artistId): artistId is string => Boolean(artistId));

            const artistImageCache = await this.getArtistImagesBatch(primaryArtistIds);

            result.tracks = data.tracks.items.map((track: SpotifyTrack, index: number) => {
              const primaryArtistId = track.artists?.[0]?.id;
              const primaryArtistImage = primaryArtistId
                ? (artistImageCache[primaryArtistId] ?? null)
                : null;
              const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
                primaryArtistImage,
              });
              return { ...normalized, trackNumber: normalized.trackNumber ?? index + 1 };
            });
          }

          if (data.albums?.items) {
            result.albums = data.albums.items.map((album: SpotifyAlbum) => ({
              artistId: album.artists?.[0]?.id || "unknown",
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

          if (data.artists?.items) {
            result.artists = data.artists.items.map((artist) => ({
              id: artist.id as string,
              name: artist.name,
              image: artist.images?.[0]?.url ?? null,
              spotifyUrl: artist.external_urls?.spotify ?? null,
            }));
          }
        }),
      );

      return result;
    } catch (error) {
      this.log(`Failed to search catalog: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
