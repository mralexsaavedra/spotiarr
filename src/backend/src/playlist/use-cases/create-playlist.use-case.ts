import { Injectable, Logger } from '@nestjs/common';
import { PlaylistEntity } from '../playlist.entity';
import { PlaylistRepository } from '../playlist.repository';
import { PlaylistGateway } from '../playlist.gateway';
import { SpotifyService } from '../../shared/spotify.service';
import { TrackService } from '../../track/track.service';
import { SpotifyUrlHelper, SpotifyUrlType } from '../../shared/spotify-url.helper';

@Injectable()
export class CreatePlaylistUseCase {
  private readonly logger = new Logger(CreatePlaylistUseCase.name);

  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly playlistGateway: PlaylistGateway,
    private readonly spotifyService: SpotifyService,
    private readonly trackService: TrackService,
  ) {}

  async execute(playlist: PlaylistEntity): Promise<void> {
    let detail: { tracks: any; name: any; image: any; type: any };
    let playlist2Save: PlaylistEntity;

    // Step 1: Fetch playlist details from Spotify
    try {
      detail = await this.spotifyService.getPlaylistDetail(playlist.spotifyUrl);
      this.logger.debug(
        `Playlist detail retrieved with ${detail.tracks?.length || 0} tracks`,
      );

      // Format name for tracks and albums
      let displayName = detail.name;
      if (
        (detail.type === 'track' || detail.type === 'album') &&
        detail.tracks?.length > 0
      ) {
        const firstTrack = detail.tracks[0];
        if (firstTrack.artist && detail.name) {
          displayName = `${firstTrack.artist} - ${detail.name}`;
        }
      }

      const artistImageUrl = detail.tracks?.[0]?.primaryArtistImage || null;

      playlist2Save = {
        ...playlist,
        name: displayName,
        coverUrl: detail.image,
        type: detail.type,
        artistImageUrl: artistImageUrl,
      };
    } catch (error) {
      this.logger.error(
        `Error getting playlist details: ${playlist.spotifyUrl}`,
        error instanceof Error ? error.stack : String(error),
      );
      playlist2Save = {
        ...playlist,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Step 2: Save playlist
    const savedPlaylist = await this.playlistRepository.save(playlist2Save);
    this.playlistGateway.emitNew(savedPlaylist);

    // Step 3: Process tracks if available
    if (detail?.tracks && detail.tracks.length > 0) {
      await this.processTracks(savedPlaylist, detail.tracks);
    } else {
      this.logger.warn(`No tracks found for playlist ${savedPlaylist.name}`);
    }
  }

  private async processTracks(
    playlist: PlaylistEntity,
    tracks: any[],
  ): Promise<void> {
    this.logger.debug(
      `Starting to process ${tracks.length} tracks for playlist ${playlist.name}`,
    );

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const urlType = SpotifyUrlHelper.getUrlType(playlist.spotifyUrl);
    const isTrack = urlType === SpotifyUrlType.Track;
    const isAlbum = urlType === SpotifyUrlType.Album;

    for (const track of tracks) {
      try {
        if (!track.artist || !track.name) {
          this.logger.warn(
            `Skipping track ${processedCount + skippedCount + 1}: Missing artist or name information`,
          );
          skippedCount++;
          continue;
        }

        if (track.unavailable === true) {
          this.logger.warn(
            `Skipping unavailable track ${processedCount + skippedCount + 1}: ${track.artist} - ${track.name}`,
          );
          skippedCount++;
          continue;
        }

        const artistToUse =
          (isAlbum || isTrack) && track.primaryArtist
            ? track.primaryArtist
            : track.artist;

        await this.trackService.create(
          {
            artist: artistToUse,
            name: track.name,
            album: track.album ?? (isTrack ? 'Singles' : playlist.name),
            albumYear: track.albumYear,
            trackNumber: track.trackNumber ?? processedCount + 1,
            spotifyUrl: track.previewUrl || null,
            artists: track.artists,
            trackUrl: track.trackUrl,
          },
          playlist,
        );

        processedCount++;

        if (processedCount % 100 === 0) {
          this.logger.debug(
            `Processed ${processedCount} tracks so far for playlist ${playlist.name}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error creating track "${track?.artist || 'Unknown'} - ${track?.name || 'Unknown'}": ${error instanceof Error ? error.message : String(error)}`,
        );
        errorCount++;
      }
    }

    this.logger.debug(
      `Finished processing playlist ${playlist.name}: ${processedCount} tracks processed, ${skippedCount} skipped, ${errorCount} errors`,
    );
  }
}
