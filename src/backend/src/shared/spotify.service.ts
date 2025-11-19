import { Injectable, Logger } from '@nestjs/common';
import { TrackService } from '../track/track.service';
import { SpotifyApiService } from './spotify-api.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('isomorphic-unfetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDetails } = require('spotify-url-info')(fetch);

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(TrackService.name);

  constructor(private readonly spotifyApiService: SpotifyApiService) {}

  async getPlaylistDetail(
    spotifyUrl: string,
  ): Promise<{ name: string; tracks: any[]; image: string; type: string }> {
    this.logger.debug(`Get playlist ${spotifyUrl} on Spotify`);

    // Detect type from URL
    let type = 'playlist';
    if (spotifyUrl.includes('/track/')) {
      type = 'track';
    } else if (spotifyUrl.includes('/album/')) {
      type = 'album';
    }

    try {
      // Detect the type of Spotify URL
      const isTrack = spotifyUrl.includes('/track/');
      const isAlbum = spotifyUrl.includes('/album/');
      const isPlaylist = spotifyUrl.includes('/playlist/');

      if (isTrack) {
        // Handle single track
        const trackId = this.extractId(spotifyUrl);
        const track = await this.spotifyApiService.getTrackDetails(trackId);
        const detail = await getDetails(spotifyUrl);

        return {
          name: track.name,
          tracks: [track],
          image: detail.preview?.image || '',
        };
      } else if (isAlbum) {
        // Handle album
        const albumId = this.extractId(spotifyUrl);
        const tracks = await this.spotifyApiService.getAlbumTracks(albumId);
        const detail = await getDetails(spotifyUrl);

        return {
          name: tracks[0]?.album || detail.preview?.title || 'Unknown Album',
          tracks: tracks || [],
          image: detail.preview?.image || '',
          type,
        };
      } else if (isPlaylist) {
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

  private extractId(spotifyUrl: string): string {
    const match = spotifyUrl.match(/\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
    return match ? match[2] : '';
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
