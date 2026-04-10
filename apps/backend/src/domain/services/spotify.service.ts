import { NormalizedTrack, SpotifyPlaylist, SpotifySearchResults } from "@spotiarr/shared";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyAlbumClient } from "@/infrastructure/external/spotify-album.client";
import { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";
import { SpotifyPlaylistClient } from "@/infrastructure/external/spotify-playlist.client";
import { SpotifySearchClient } from "@/infrastructure/external/spotify-search.client";
import { SpotifyTrackClient } from "@/infrastructure/external/spotify-track.client";
import { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";
import { getErrorMessage } from "@/infrastructure/utils/error.utils";
import { SpotifyUrlHelper, SpotifyUrlType } from "../helpers/spotify-url.helper";

export type PlaylistTrack = NormalizedTrack;

export interface PlaylistTracksPageResult {
  tracks: PlaylistTrack[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export class SpotifyService {
  constructor(
    private readonly spotifyArtistClient: SpotifyArtistClient,
    private readonly spotifyTrackClient: SpotifyTrackClient,
    private readonly spotifyAlbumClient: SpotifyAlbumClient,
    private readonly spotifyPlaylistClient: SpotifyPlaylistClient,
    private readonly spotifySearchClient: SpotifySearchClient,
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
  ) {}

  async getPlaylistDetail(
    spotifyUrl: string,
    previewOnly = false,
  ): Promise<{
    name: string;
    tracks: PlaylistTrack[];
    image: string;
    type: string;
    owner?: string;
    ownerUrl?: string;
  }> {
    console.debug(`Get playlist ${spotifyUrl} on Spotify`);

    const urlType = SpotifyUrlHelper.getUrlType(spotifyUrl);
    const type = urlType.toString();

    try {
      if (urlType === SpotifyUrlType.Track) {
        const trackId = SpotifyUrlHelper.extractId(spotifyUrl);
        const track = await this.spotifyTrackClient.getTrackDetails(trackId);

        return {
          name: track.name,
          tracks: [track],
          image: track.albumCoverUrl ?? "",
          type,
        };
      } else if (urlType === SpotifyUrlType.Album) {
        const albumId = SpotifyUrlHelper.extractId(spotifyUrl);
        const tracks = await this.spotifyAlbumClient.getAlbumTracks(albumId);

        return {
          name: tracks[0]?.album || "Unknown Album",
          tracks: tracks || [],
          image: tracks[0]?.albumCoverUrl ?? "",
          type,
        };
      } else if (urlType === SpotifyUrlType.Playlist) {
        const metadata = await this.spotifyPlaylistClient.getPlaylistMetadata(spotifyUrl);

        const tracks = await this.spotifyPlaylistClient.getAllPlaylistTracks(
          spotifyUrl,
          previewOnly,
        );

        return {
          name: metadata.name,
          tracks: tracks || [],
          image: metadata.image,
          type,
          owner: metadata.owner,
          ownerUrl: metadata.ownerUrl,
        };
      } else if (urlType === SpotifyUrlType.Artist) {
        throw new AppError(
          400,
          "invalid_spotify_url",
          "Artist downloads are no longer supported due to Spotify API changes.",
        );
      }

      const _exhaustiveCheck: never = urlType;
      throw new AppError(400, "invalid_spotify_url", `Unhandled URL type: ${_exhaustiveCheck}`);
    } catch (error) {
      console.error(`Error getting playlist details: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async getPlaylistTracks(spotifyUrl: string): Promise<PlaylistTrack[]> {
    console.debug(`Get playlist ${spotifyUrl} on Spotify`);
    try {
      return await this.spotifyPlaylistClient.getAllPlaylistTracks(spotifyUrl);
    } catch (error) {
      console.error(`Error getting playlist tracks: ${getErrorMessage(error)}`);
      return [];
    }
  }

  async getPlaylistTracksPage(
    spotifyUrl: string,
    offset: number,
    limit: number,
  ): Promise<PlaylistTracksPageResult> {
    console.debug(
      `Get playlist page ${spotifyUrl} on Spotify (offset: ${offset}, limit: ${limit})`,
    );

    try {
      return await this.spotifyPlaylistClient.getPlaylistTracksPage(spotifyUrl, offset, limit);
    } catch (error) {
      console.error(`Error getting playlist tracks page: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async getMyPlaylists(): Promise<SpotifyPlaylist[]> {
    console.debug(`Get user's playlists on Spotify`);
    try {
      return await this.spotifyUserLibraryService.getMyPlaylists();
    } catch (error) {
      console.error(`Error getting user playlists: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  async searchCatalog(
    query: string,
    types?: string[],
    limits?: { track?: number; album?: number; artist?: number },
  ): Promise<SpotifySearchResults> {
    console.debug(`Search catalog for ${query} on Spotify`);
    try {
      return await this.spotifySearchClient.searchCatalog(query, types, limits);
    } catch (error) {
      console.error(`Error searching catalog: ${getErrorMessage(error)}`);
      throw error;
    }
  }
}
