import { NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyUrlHelper } from "@/domain/helpers/spotify-url.helper";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyAlbumClient } from "./spotify-album.client";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import { SpotifyTrackClient } from "./spotify-track.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyImage, SpotifyPlaylistTrackItem } from "./spotify.types";

export class SpotifyPlaylistClient extends SpotifyBaseClient {
  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    private readonly trackClient: SpotifyTrackClient,
    private readonly albumClient: SpotifyAlbumClient,
  ) {
    super(authService, settingsService, "SpotifyPlaylistClient");
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
  }

  async getAllPlaylistTracks(spotifyUrl: string): Promise<NormalizedTrack[]> {
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
        let offset = 0;
        let hasMoreTracks = true;
        let useUserToken = false; // Track if we need to use user token

        while (hasMoreTracks) {
          this.log(`Fetching tracks from Spotify API with offset ${offset}`);

          const market = await this.getMarket();
          const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${offset}&limit=100&market=${market}&fields=items(track(name,artists(name,external_urls),preview_url,external_urls,album(name,release_date,images,external_urls),track_number,duration_ms,is_playable)),next`;

          let response: Response;

          if (useUserToken) {
            response = await this.fetchWithUserToken(url);
          } else {
            response = await this.fetchWithAppToken(url);

            if (response.status === 404 && offset === 0) {
              this.log(`Playlist not accessible with app token, trying user token...`, "warn");
              try {
                response = await this.fetchWithUserToken(url);
                useUserToken = true;
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
              return SpotifyTrackMapper.toNormalizedTrack(item.track, {
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

      return [];
    } catch (error) {
      this.log(`Failed to get all playlist tracks: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
