import { NormalizedTrack, SpotifyPlaylist, SpotifySearchResults } from "@spotiarr/shared";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyUrlHelper, SpotifyUrlType } from "@/domain/helpers/spotify-url.helper";

type SpotifyArtistClientLike = { getArtistDetails(id: string): Promise<unknown> };
type SpotifyTrackClientLike = { getTrackDetails(id: string): Promise<NormalizedTrack> };
type SpotifyAlbumClientLike = {
  getAlbumTracks(id: string): Promise<NormalizedTrack[]>;
  getAlbumDetails(id: string): Promise<{ images?: Array<{ url?: string }> }>;
};
type SpotifyPlaylistClientLike = {
  getPlaylistMetadata(url: string): Promise<{
    name: string;
    image: string;
    owner?: string;
    ownerUrl?: string;
  }>;
  getAllPlaylistTracks(url: string, previewOnly?: boolean): Promise<NormalizedTrack[]>;
  getPlaylistTracksPage(
    url: string,
    offset: number,
    limit: number,
  ): Promise<PlaylistTracksPageResult>;
};
type SpotifySearchClientLike = {
  searchCatalog(
    query: string,
    types?: string[],
    limits?: { track?: number; album?: number; artist?: number },
  ): Promise<SpotifySearchResults>;
};
type SpotifyUserLibraryLike = { getMyPlaylists(): Promise<SpotifyPlaylist[]> };

export interface SpotifyServiceDeps {
  artistClient: SpotifyArtistClientLike;
  trackClient: SpotifyTrackClientLike;
  albumClient: SpotifyAlbumClientLike;
  playlistClient: SpotifyPlaylistClientLike;
  searchClient: SpotifySearchClientLike;
  userLibraryService: SpotifyUserLibraryLike;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type PlaylistTrack = NormalizedTrack;

export interface PlaylistTracksPageResult {
  tracks: PlaylistTrack[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export class SpotifyService {
  constructor(private readonly deps: SpotifyServiceDeps) {}

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
    const urlType = SpotifyUrlHelper.getUrlType(spotifyUrl);
    const type = urlType.toString();

    try {
      if (urlType === SpotifyUrlType.Track) {
        const trackId = SpotifyUrlHelper.extractId(spotifyUrl);
        const track = await this.deps.trackClient.getTrackDetails(trackId);
        return { name: track.name, tracks: [track], image: track.albumCoverUrl ?? "", type };
      }

      if (urlType === SpotifyUrlType.Album) {
        const albumId = SpotifyUrlHelper.extractId(spotifyUrl);
        const tracks = await this.deps.albumClient.getAlbumTracks(albumId);
        return {
          name: tracks[0]?.album || "Unknown Album",
          tracks: tracks || [],
          image: tracks[0]?.albumCoverUrl ?? "",
          type,
        };
      }

      if (urlType === SpotifyUrlType.Playlist) {
        const metadata = await this.deps.playlistClient.getPlaylistMetadata(spotifyUrl);
        const tracks = await this.deps.playlistClient.getAllPlaylistTracks(spotifyUrl, previewOnly);
        return {
          name: metadata.name,
          tracks: tracks || [],
          image: metadata.image,
          type,
          owner: metadata.owner,
          ownerUrl: metadata.ownerUrl,
        };
      }

      if (urlType === SpotifyUrlType.Artist) {
        throw new AppError(
          400,
          "invalid_spotify_url",
          "Artist downloads are no longer supported due to Spotify API changes.",
        );
      }

      throw new AppError(400, "invalid_spotify_url", "Unhandled URL type");
    } catch (error) {
      console.error(`Error getting playlist details: ${toErrorMessage(error)}`);
      throw error;
    }
  }

  async getCoverImage(spotifyUrl: string): Promise<string> {
    const urlType = SpotifyUrlHelper.getUrlType(spotifyUrl);
    try {
      if (urlType === SpotifyUrlType.Track) {
        const track = await this.deps.trackClient.getTrackDetails(
          SpotifyUrlHelper.extractId(spotifyUrl),
        );
        return track.albumCoverUrl ?? "";
      }
      if (urlType === SpotifyUrlType.Album) {
        const album = await this.deps.albumClient.getAlbumDetails(
          SpotifyUrlHelper.extractId(spotifyUrl),
        );
        return album.images?.[0]?.url ?? "";
      }
      if (urlType === SpotifyUrlType.Playlist) {
        const metadata = await this.deps.playlistClient.getPlaylistMetadata(spotifyUrl);
        return metadata.image ?? "";
      }
      return "";
    } catch {
      return "";
    }
  }

  async getPlaylistTracks(spotifyUrl: string): Promise<PlaylistTrack[]> {
    try {
      return await this.deps.playlistClient.getAllPlaylistTracks(spotifyUrl);
    } catch (error) {
      console.error(`Error getting playlist tracks: ${toErrorMessage(error)}`);
      return [];
    }
  }

  async getPlaylistTracksPage(
    spotifyUrl: string,
    offset: number,
    limit: number,
  ): Promise<PlaylistTracksPageResult> {
    try {
      return await this.deps.playlistClient.getPlaylistTracksPage(spotifyUrl, offset, limit);
    } catch (error) {
      console.error(`Error getting playlist tracks page: ${toErrorMessage(error)}`);
      throw error;
    }
  }

  async getMyPlaylists(): Promise<SpotifyPlaylist[]> {
    return this.deps.userLibraryService.getMyPlaylists();
  }

  async searchCatalog(
    query: string,
    types?: string[],
    limits?: { track?: number; album?: number; artist?: number },
  ): Promise<SpotifySearchResults> {
    return this.deps.searchClient.searchCatalog(query, types, limits);
  }
}
