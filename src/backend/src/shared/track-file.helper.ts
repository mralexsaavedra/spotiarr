import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrackEntity } from '../track/track.entity';
import { EnvironmentEnum } from '../environmentEnum';
import { UtilsService } from './utils.service';
import { SpotifyUrlHelper } from './spotify-url.helper';

@Injectable()
export class TrackFileHelper {
  constructor(
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,
  ) {}

  getTrackFileName(track: TrackEntity): string {
    const format = this.configService.get<string>(EnvironmentEnum.FORMAT);
    const trackName = track.name || 'Unknown Track';
    const trackNumber = track.trackNumber ?? 1;
    const artistName = track.artist || 'Unknown Artist';

    // Check if this track belongs to a Spotify playlist
    const isPlaylist = SpotifyUrlHelper.isPlaylist(track.playlist?.spotifyUrl);

    if (isPlaylist) {
      // For playlists: keep all artists in the filename
      const playlistName = track.playlist?.name || 'Unknown Playlist';
      return this.utilsService.getPlaylistTrackFilePath(
        playlistName,
        artistName,
        trackName,
        trackNumber,
        format,
      );
    } else {
      // For albums/tracks: artist is already the primary artist from Spotify
      const albumName = track.album || track.playlist?.name || 'Unknown Album';
      return this.utilsService.getTrackFilePath(
        artistName,
        albumName,
        trackName,
        trackNumber,
        format,
      );
    }
  }

  getFolderName(track: TrackEntity): string {
    // Use Jellyfin-compatible structure
    return this.getTrackFileName(track);
  }
}
