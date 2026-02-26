import { AlbumType, SpotifySearchResults } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyArtistClient } from "./spotify-artist.client";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyAlbum, SpotifyTrack } from "./spotify.types";

export class SpotifySearchClient extends SpotifyBaseClient {
  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    private readonly artistClient: SpotifyArtistClient,
  ) {
    super(authService, settingsService, "SpotifySearchClient");
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
            const artistImageCache: Record<string, string | null> = {};
            const getPrimaryArtistImage = async (
              primaryArtistId: string | undefined,
            ): Promise<string | null> => {
              if (!primaryArtistId) return null;
              if (primaryArtistId in artistImageCache) {
                return artistImageCache[primaryArtistId];
              }
              const image = await this.artistClient.getArtistImage(primaryArtistId);
              artistImageCache[primaryArtistId] = image;
              return image;
            };

            result.tracks = await Promise.all(
              data.tracks.items.map(async (track: SpotifyTrack, index: number) => {
                const primaryArtistId = track.artists?.[0]?.id;
                const primaryArtistImage = await getPrimaryArtistImage(primaryArtistId);
                const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
                  primaryArtistImage,
                });
                return { ...normalized, trackNumber: normalized.trackNumber ?? index + 1 };
              }),
            );
          }

          if (data.albums?.items) {
            result.albums = data.albums.items.map((album: SpotifyAlbum) => ({
              artistId: album.artists?.[0]?.id || "unknown",
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
