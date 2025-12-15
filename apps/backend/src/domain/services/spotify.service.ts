import { NormalizedTrack, SpotifyPlaylist } from "@spotiarr/shared";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyCatalogService } from "@/infrastructure/external/spotify-catalog.service";
import { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";
import { getErrorMessage } from "@/infrastructure/utils/error.utils";
import { SpotifyUrlHelper, SpotifyUrlType } from "../helpers/spotify-url.helper";

export type PlaylistTrack = NormalizedTrack;

export class SpotifyService {
  constructor(
    private readonly spotifyCatalogService: SpotifyCatalogService,
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
  ) {}

  async getPlaylistDetail(spotifyUrl: string): Promise<{
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
        const track = await this.spotifyCatalogService.getTrackDetails(trackId);

        return {
          name: track.name,
          tracks: [track],
          image: track.albumCoverUrl ?? "",
          type,
        };
      } else if (urlType === SpotifyUrlType.Album) {
        const albumId = SpotifyUrlHelper.extractId(spotifyUrl);
        const tracks = await this.spotifyCatalogService.getAlbumTracks(albumId);

        return {
          name: tracks[0]?.album || "Unknown Album",
          tracks: tracks || [],
          image: tracks[0]?.albumCoverUrl ?? "",
          type,
        };
      } else if (urlType === SpotifyUrlType.Playlist) {
        const metadata = await this.spotifyCatalogService.getPlaylistMetadata(spotifyUrl);

        const tracks = await this.spotifyCatalogService.getAllPlaylistTracks(spotifyUrl);

        return {
          name: metadata.name,
          tracks: tracks || [],
          image: metadata.image,
          type,
          owner: metadata.owner,
          ownerUrl: metadata.ownerUrl,
        };
      } else if (urlType === SpotifyUrlType.Artist) {
        const artistId = SpotifyUrlHelper.extractId(spotifyUrl);
        const artistDetails = await this.spotifyCatalogService.getArtistDetails(artistId);
        const tracks = await this.spotifyCatalogService.getArtistTopTracks(artistId);
        return {
          name: artistDetails.name,
          tracks: tracks || [],
          image: artistDetails.image ?? "",
          type,
        };
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
      return await this.spotifyCatalogService.getAllPlaylistTracks(spotifyUrl);
    } catch (error) {
      console.error(`Error getting playlist tracks: ${getErrorMessage(error)}`);
      return [];
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
}
