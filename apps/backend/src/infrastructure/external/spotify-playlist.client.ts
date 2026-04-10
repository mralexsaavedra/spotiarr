import { NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyUrlHelper } from "@/domain/helpers/spotify-url.helper";
import { getErrorMessage } from "../utils/error.utils";
import { PromiseCache } from "./promise-cache";
import { SpotifyAlbumClient } from "./spotify-album.client";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import type { SpotifyLimiterMode } from "./spotify-http.client";
import { SpotifyTrackClient } from "./spotify-track.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyImage, SpotifyPlaylistItem } from "./spotify.types";

export class SpotifyPlaylistClient extends SpotifyBaseClient {
  private readonly requestCache = new PromiseCache({ ttlMs: 30_000 });

  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    private readonly trackClient: SpotifyTrackClient,
    private readonly albumClient: SpotifyAlbumClient,
    limiterMode: SpotifyLimiterMode = "interactive",
  ) {
    super(authService, settingsService, "SpotifyPlaylistClient", limiterMode);
  }

  async getPlaylistMetadata(
    spotifyUrl: string,
  ): Promise<{ name: string; image: string; owner: string; ownerUrl?: string }> {
    const playlistId = SpotifyUrlHelper.extractId(spotifyUrl);
    const market = await this.getMarket();
    const cacheKey = `playlist-metadata:${playlistId}:${market}`;

    return this.requestCache.getOrSet(cacheKey, async () => {
      try {
        this.log(`Getting playlist metadata for ${spotifyUrl}`);

        const url = `https://api.spotify.com/v1/playlists/${playlistId}?market=${market}`;

        // Try with app token first
        let response = await this.fetchWithAppToken(url);

        // If we get a 404, try with user token (some playlists require user auth)
        if (response.status === 404) {
          this.log(`Playlist not accessible with app token, trying user token...`, "warn");
          try {
            response = await this.fetchWithUserToken(url);
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
    });
  }

  async getAllPlaylistTracks(
    spotifyUrl: string,
    previewOnly: boolean = false,
  ): Promise<NormalizedTrack[]> {
    try {
      this.log(`Getting all tracks for ${spotifyUrl}`);

      // Check if this is a single track URL
      if (spotifyUrl.includes("/track/")) {
        const trackId = SpotifyUrlHelper.extractId(spotifyUrl);
        const trackDetails = await this.trackClient.getTrackDetails(trackId);
        return [trackDetails];
      }

      // For albums, reuse getAlbumTracks to keep album logic in one place
      if (spotifyUrl.includes("/album/")) {
        this.log("Album detected, using Spotify API");
        const albumId = SpotifyUrlHelper.extractId(spotifyUrl);
        const albumTracks = await this.albumClient.getAlbumTracks(albumId);

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
        const market = await this.getMarket();
        // is_playable requires user token — always use user token for playlist items
        // Since Spotify Feb 2026, the item wrapper field is 'item', not 'track'
        const fields =
          "items(item(name,artists(name,external_urls,id),preview_url,external_urls,album(name,release_date,images,external_urls,total_tracks),track_number,duration_ms,is_playable)),next";
        let nextUrl: string | null =
          `https://api.spotify.com/v1/playlists/${playlistId}/items?offset=0&limit=100&market=${market}&fields=${encodeURIComponent(fields)}`;

        while (nextUrl) {
          this.log(`Fetching tracks from Spotify API via ${nextUrl}`);

          let response: Response;

          try {
            response = await this.fetchWithUserToken(nextUrl);
          } catch (userTokenError) {
            if (
              userTokenError instanceof AppError &&
              userTokenError.errorCode === "missing_user_access_token"
            ) {
              // Fallback to app token without is_playable if no user token available
              this.log(
                `No user token available, falling back to app token without is_playable`,
                "warn",
              );
              const fallbackFields =
                "items(item(name,artists(name,external_urls,id),preview_url,external_urls,album(name,release_date,images,external_urls,total_tracks),track_number,duration_ms)),next";
              const fallbackUrl = `https://api.spotify.com/v1/playlists/${playlistId}/items?offset=0&limit=100&market=${market}&fields=${encodeURIComponent(fallbackFields)}`;
              response = await this.fetchWithAppToken(fallbackUrl);
            } else {
              throw userTokenError;
            }
          }

          if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 403) {
              throw new AppError(
                403,
                "playlist_not_accessible",
                `This playlist belongs to another user. Since the Spotify API February 2026 update, only tracks from your own playlists can be accessed. Playlist ID: ${playlistId}`,
              );
            }
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
            items?: SpotifyPlaylistItem[];
            next?: string | null;
          };

          if (!data.items || data.items.length === 0) {
            this.log("No more tracks to fetch from Spotify API");
            nextUrl = data.next ?? null;
            continue;
          }

          const pageTracks = (data.items ?? [])
            .map((item: SpotifyPlaylistItem) => {
              if (!item.item) {
                return null;
              }

              return SpotifyTrackMapper.toNormalizedTrack(item.item, {
                isUnavailable: item.item.is_playable === false,
              });
            })
            .filter((track: NormalizedTrack | null) => track !== null) as typeof allTracks;

          this.log(`Retrieved ${pageTracks.length} tracks from Spotify API page`);

          if (pageTracks.length > 0) {
            allTracks.push(...pageTracks);
          }

          if (previewOnly) {
            break;
          }

          nextUrl = data.next ?? null;
        }

        this.log(`Total tracks retrieved from Spotify API: ${allTracks.length}`);
        return allTracks;
      }

      return [];
    } catch (error) {
      this.log(`Failed to get all playlist tracks: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
