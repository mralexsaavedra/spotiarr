import { Injectable, Logger } from '@nestjs/common';
import { TrackService } from '../track/track.service';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyUrlHelper, SpotifyUrlType } from './spotify-url.helper';

// CommonJS packages without ESM support
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('isomorphic-unfetch');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDetails } = require('spotify-url-info')(fetch);

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(TrackService.name);

  constructor(private readonly spotifyApiService: SpotifyApiService) {}

  async getPlaylistDetail(
    spotifyUrl: string,
  ): Promise<{ name: string; tracks: any[]; image: string; type: string }> {
    this.logger.debug(`Get playlist ${spotifyUrl} on Spotify`);

    const urlType = SpotifyUrlHelper.getUrlType(spotifyUrl);
    const type = urlType.toString();

    try {
      if (urlType === SpotifyUrlType.Track) {
        // Handle single track
        const trackId = SpotifyUrlHelper.extractId(spotifyUrl);
        const track = await this.spotifyApiService.getTrackDetails(trackId);
        const detail = await getDetails(spotifyUrl);

        return {
          name: track.name,
          tracks: [track],
          image: detail.preview?.image || '',
          type,
        };
      } else if (urlType === SpotifyUrlType.Album) {
        // Handle album
        const albumId = SpotifyUrlHelper.extractId(spotifyUrl);
        const tracks = await this.spotifyApiService.getAlbumTracks(albumId);
        const detail = await getDetails(spotifyUrl);

        return {
          name: tracks[0]?.album || detail.preview?.title || 'Unknown Album',
          tracks: tracks || [],
          image: detail.preview?.image || '',
          type,
        };
      } else if (urlType === SpotifyUrlType.Playlist) {
        // Handle playlist
        const metadata =
          await this.spotifyApiService.getPlaylistMetadata(spotifyUrl);

        const tracks =
          await this.spotifyApiService.getAllPlaylistTracks(spotifyUrl);

        return {
          name: metadata.name,
          tracks: tracks || [],
          image: metadata.image,
          type,
        };
      }

      throw new Error('Unknown Spotify URL type');
    } catch (error) {
      this.logger.error(`Error getting playlist details: ${error.message}`);
      const detail = await getDetails(spotifyUrl);
      return {
        name: detail.preview.title,
        tracks: detail?.tracks ?? [],
        image: detail.preview.image,
        type,
      };
    }
  }

  async getPlaylistTracks(spotifyUrl: string): Promise<any[]> {
    this.logger.debug(`Get playlist ${spotifyUrl} on Spotify`);
    try {
      return await this.spotifyApiService.getAllPlaylistTracks(spotifyUrl);
    } catch (error) {
      this.logger.error(`Error getting playlist tracks: ${error.message}`);
      return (await getDetails(spotifyUrl)?.tracks) ?? [];
    }
  }
}
