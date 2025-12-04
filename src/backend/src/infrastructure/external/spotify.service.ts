import { SpotifyUrlHelper, SpotifyUrlType } from "../../domain/helpers/spotify-url.helper";
import { NormalizedTrack } from "../../types/spotify";
import { SpotifyApiService } from "./spotify-api.service";

export type PlaylistTrack = NormalizedTrack;

export class SpotifyService {
  constructor(private readonly spotifyApiService: SpotifyApiService) {}

  async getPlaylistDetail(
    spotifyUrl: string,
  ): Promise<{ name: string; tracks: PlaylistTrack[]; image: string; type: string }> {
    console.debug(`Get playlist ${spotifyUrl} on Spotify`);

    const urlType = SpotifyUrlHelper.getUrlType(spotifyUrl);
    const type = urlType.toString();

    try {
      if (urlType === SpotifyUrlType.Track) {
        const trackId = SpotifyUrlHelper.extractId(spotifyUrl);
        const track = await this.spotifyApiService.getTrackDetails(trackId);

        return {
          name: track.name,
          tracks: [track],
          image: track.albumCoverUrl ?? "",
          type,
        };
      } else if (urlType === SpotifyUrlType.Album) {
        const albumId = SpotifyUrlHelper.extractId(spotifyUrl);
        const tracks = await this.spotifyApiService.getAlbumTracks(albumId);

        return {
          name: tracks[0]?.album || "Unknown Album",
          tracks: tracks || [],
          image: tracks[0]?.albumCoverUrl ?? "",
          type,
        };
      } else if (urlType === SpotifyUrlType.Playlist) {
        const metadata = await this.spotifyApiService.getPlaylistMetadata(spotifyUrl);

        const tracks = await this.spotifyApiService.getAllPlaylistTracks(spotifyUrl);

        return {
          name: metadata.name,
          tracks: tracks || [],
          image: metadata.image,
          type,
        };
      } else if (urlType === SpotifyUrlType.Artist) {
        const artistId = SpotifyUrlHelper.extractId(spotifyUrl);
        const artistDetails = await this.spotifyApiService.getArtistDetails(artistId);
        const tracks = await this.spotifyApiService.getArtistTopTracks(artistId);
        return {
          name: artistDetails.name,
          tracks: tracks || [],
          image: artistDetails.image ?? "",
          type,
        };
      }

      throw new Error("Unknown Spotify URL type");
    } catch (error) {
      console.error(`Error getting playlist details: ${(error as Error).message}`);
      throw error;
    }
  }

  async getPlaylistTracks(spotifyUrl: string): Promise<PlaylistTrack[]> {
    console.debug(`Get playlist ${spotifyUrl} on Spotify`);
    try {
      return await this.spotifyApiService.getAllPlaylistTracks(spotifyUrl);
    } catch (error) {
      console.error(`Error getting playlist tracks: ${(error as Error).message}`);
      return [];
    }
  }
}
