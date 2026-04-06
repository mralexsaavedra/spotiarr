import { NormalizedTrack } from "@spotiarr/shared";
import { SettingsService } from "@/application/services/settings.service";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";
import { SpotifyArtistClient } from "./spotify-artist.client";
import { SpotifyAuthService } from "./spotify-auth.service";
import { SpotifyBaseClient } from "./spotify-base.client";
import { SpotifyTrackMapper } from "./spotify-track.mapper";
import { SpotifyAlbum, SpotifyAlbumTracksResponse, SpotifyTrack } from "./spotify.types";

export class SpotifyAlbumClient extends SpotifyBaseClient {
  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsService,
    private readonly artistClient: SpotifyArtistClient,
  ) {
    super(authService, settingsService, "SpotifyAlbumClient");
  }

  /**
   * Get album details from Spotify API
   */
  async getAlbumTracks(albumId: string): Promise<NormalizedTrack[]> {
    try {
      // Fetch full album metadata first (includes album-level artists, cover, etc.)
      const albumResponse = await this.fetchWithAppToken(
        `https://api.spotify.com/v1/albums/${albumId}`,
      );
      if (!albumResponse.ok) {
        if (albumResponse.status === 404) {
          throw new AppError(404, "playlist_not_found", `Album not found: ${albumId}`);
        }
        if (albumResponse.status === 429) {
          throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
        }
        throw new AppError(
          albumResponse.status,
          "internal_server_error",
          `Failed to fetch album: ${albumResponse.status}`,
        );
      }
      const albumData = (await albumResponse.json()) as SpotifyAlbum;

      // Paginate through all tracks (Spotify returns max 50 per page)
      const allTracks: SpotifyTrack[] = [];
      let url: string | null =
        `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

      while (url) {
        const response = await this.fetchWithAppToken(url);
        if (!response.ok) {
          if (response.status === 429) {
            throw new AppError(429, "spotify_rate_limited", "Rate limited by Spotify API.");
          }
          throw new AppError(
            response.status,
            "internal_server_error",
            `Failed to fetch album tracks: ${response.status}`,
          );
        }
        const page = (await response.json()) as SpotifyAlbumTracksResponse;
        allTracks.push(...page.items);
        url = page.next;
      }

      // Get artist image using the album's primary artist
      const firstArtistId = albumData.artists?.[0]?.id ?? allTracks[0]?.artists[0]?.id;
      const artistImage = firstArtistId
        ? await this.artistClient.getArtistImage(firstArtistId)
        : null;

      return allTracks.map((track: SpotifyTrack) => {
        const normalized = SpotifyTrackMapper.toNormalizedTrack(track, {
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
}
