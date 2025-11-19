import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('isomorphic-unfetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDetails } = require('spotify-url-info')(fetch);

@Injectable()
export class SpotifyApiService {
  private readonly logger = new Logger(SpotifyApiService.name);
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {}

  private getPlaylistId(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const playlistIndex = pathParts.findIndex((part) => part === 'playlist');
      if (playlistIndex >= 0 && pathParts.length > playlistIndex + 1) {
        return pathParts[playlistIndex + 1].split('?')[0];
      }
      throw new Error('Invalid Spotify playlist URL');
    } catch (error) {
      this.logger.error(`Failed to extract playlist ID: ${error.message}`);
      throw error;
    }
  }

  private getAlbumId(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const albumIndex = pathParts.findIndex((part) => part === 'album');
      if (albumIndex >= 0 && pathParts.length > albumIndex + 1) {
        return pathParts[albumIndex + 1].split('?')[0];
      }
      throw new Error('Invalid Spotify album URL');
    } catch (error) {
      this.logger.error(`Failed to extract album ID: ${error.message}`);
      throw error;
    }
  }

  async getPlaylistMetadata(
    spotifyUrl: string,
  ): Promise<{ name: string; image: string }> {
    try {
      this.logger.debug(`Getting playlist metadata for ${spotifyUrl}`);
      const detail = await getDetails(spotifyUrl);

      return {
        name: detail.preview.title,
        image: detail.preview.image,
      };
    } catch (error) {
      this.logger.error(`Failed to get playlist metadata: ${error.message}`);
      throw error;
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      this.logger.debug('Getting new Spotify access token');

      const clientId = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          'Missing Spotify credentials. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file',
        );
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to get access token: ${errorData}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;

      this.logger.debug('Successfully obtained Spotify access token');
      return this.accessToken;
    } catch (error) {
      this.logger.error(`Error getting Spotify access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get artist image from Spotify API
   */
  async getArtistImage(artistId: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(`Failed to fetch artist image: ${response.status}`);
        return null;
      }

      const artist = await response.json();

      // Return the largest image available
      return artist.images?.[0]?.url || null;
    } catch (error) {
      this.logger.error(`Failed to get artist image: ${error.message}`);
      return null;
    }
  }

  /**
   * Get track details from Spotify API for a single track
   */
  async getTrackDetails(trackId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch track: ${response.status}`);
      }

      const track = await response.json();

      // Get artist image
      const artistId = track.artists[0]?.id;
      const artistImage = artistId ? await this.getArtistImage(artistId) : null;

      // Extract year from release_date (format: "YYYY-MM-DD" or "YYYY")
      const releaseDate = track.album?.release_date;
      const albumYear = releaseDate
        ? parseInt(releaseDate.substring(0, 4))
        : undefined;

      return {
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        primaryArtist: track.artists[0]?.name, // First artist as primary
        primaryArtistImage: artistImage, // Artist image
        album: track.album?.name,
        albumYear: albumYear, // Year of the album
        trackNumber: track.track_number,
        previewUrl: track.preview_url,
      };
    } catch (error) {
      this.logger.error(`Failed to get track details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get album details from Spotify API
   */
  async getAlbumTracks(albumId: string): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}/tracks`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch album: ${response.status}`);
      }

      const data = await response.json();
      const albumResponse = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const albumData = await albumResponse.json();
      const albumName = albumData.name;

      // Get artist image (all tracks in album have same primary artist)
      const firstArtistId = data.items[0]?.artists[0]?.id;
      const artistImage = firstArtistId
        ? await this.getArtistImage(firstArtistId)
        : null;

      // Extract year from release_date
      const releaseDate = albumData.release_date;
      const albumYear = releaseDate
        ? parseInt(releaseDate.substring(0, 4))
        : undefined;

      return data.items.map((track: any) => ({
        name: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        primaryArtist: track.artists[0]?.name, // First artist as primary
        primaryArtistImage: artistImage, // Artist image
        album: albumName,
        albumYear: albumYear, // Year of the album
        trackNumber: track.track_number,
        previewUrl: track.preview_url,
      }));
    } catch (error) {
      this.logger.error(`Failed to get album tracks: ${error.message}`);
      throw error;
    }
  }

  async getAllPlaylistTracks(spotifyUrl: string): Promise<any[]> {
    try {
      this.logger.debug(`Getting all tracks for ${spotifyUrl}`);

      // Check if this is a single track URL
      if (spotifyUrl.includes('/track/')) {
        const trackDetails = await this.getTrackDetails(spotifyUrl);
        return [trackDetails];
      }

      // For albums, use Spotify API
      if (spotifyUrl.includes('/album/')) {
        this.logger.debug('Album detected, using Spotify API');
        const albumId = this.getAlbumId(spotifyUrl);
        const accessToken = await this.getAccessToken();

        const response = await fetch(
          `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch album: ${response.status}`);
        }

        const data = await response.json();
        const tracks = data.items.map((track: any) => ({
          name: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          artists: track.artists.map((a: any) => ({
            name: a.name,
            url: a.external_urls?.spotify,
          })),
          trackUrl: track.external_urls?.spotify,
          previewUrl: track.preview_url,
        }));

        this.logger.debug(
          `Retrieved ${tracks.length} album tracks with artistUrl`,
        );
        return tracks;
      }

      // For playlists, use Spotify API with pagination support
      if (spotifyUrl.includes('/playlist/')) {
        this.logger.debug('Playlist detected, using Spotify API');
        const playlistId = this.getPlaylistId(spotifyUrl);
        const accessToken = await this.getAccessToken();

        const allTracks = [];
        let offset = 0;
        let hasMoreTracks = true;

        while (hasMoreTracks) {
          this.logger.debug(
            `Fetching tracks from Spotify API with offset ${offset}`,
          );

          const response = await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks?offset=${offset}&limit=100&fields=items(track(name,artists(name,external_urls),preview_url,external_urls)),next`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(
              `Spotify API error: ${response.status} ${errorText}`,
            );
            throw new Error(`Failed to fetch tracks: ${response.status}`);
          }

          const data = await response.json();

          if (!data.items || data.items.length === 0) {
            this.logger.debug('No more tracks to fetch from Spotify API');
            hasMoreTracks = false;
            continue;
          }

          const pageTracks = data.items
            .map(
              (item: {
                track: {
                  name: any;
                  artists: any[];
                  preview_url: any;
                  external_urls?: { spotify?: string };
                  album?: { name: string; release_date?: string };
                  track_number?: number;
                };
              }) => {
                if (!item.track) return null;

                const albumYear = item.track.album?.release_date
                  ? parseInt(item.track.album.release_date.substring(0, 4))
                  : undefined;

                return {
                  name: item.track.name,
                  artist: item.track.artists.map((a) => a.name).join(', '),
                  artists: item.track.artists.map((a) => ({
                    name: a.name,
                    url: a.external_urls?.spotify,
                  })),
                  trackUrl: item.track.external_urls?.spotify,
                  album: item.track.album?.name,
                  albumYear: albumYear,
                  trackNumber: item.track.track_number,
                  previewUrl: item.track.preview_url,
                };
              },
            )
            .filter((track) => track !== null);

          this.logger.debug(
            `Retrieved ${pageTracks.length} tracks from Spotify API at offset ${offset}`,
          );

          if (pageTracks.length > 0) {
            allTracks.push(...pageTracks);
          }

          if (pageTracks.length < 100) {
            hasMoreTracks = false;
          } else {
            offset += 100;
          }
        }

        this.logger.debug(
          `Total tracks retrieved from Spotify API: ${allTracks.length}`,
        );
        return allTracks;
      }

      // If we reach here, return empty array
      return [];
    } catch (error) {
      this.logger.error(`Failed to get all playlist tracks: ${error.message}`);
      throw error;
    }
  }

  private getTrackId(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const trackIndex = pathParts.findIndex((part) => part === 'track');
      if (trackIndex >= 0 && pathParts.length > trackIndex + 1) {
        return pathParts[trackIndex + 1].split('?')[0];
      }
      throw new Error('Invalid Spotify track URL');
    } catch (error) {
      this.logger.error(`Failed to extract track ID: ${error.message}`);
      throw error;
    }
  }
}
