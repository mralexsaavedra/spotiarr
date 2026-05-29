import type { ITrack } from "@spotiarr/shared";
import * as path from "path";
import type {
  FileSystemTrackPathPort,
  M3uPort,
  MetadataPort,
} from "@/application/ports/file-system.port";
import { ArtworkService } from "@/application/services/artwork.service";
import { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { TrackRepository } from "@/domain/repositories/track.repository";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class TrackPostProcessingService {
  constructor(
    private readonly artworkService: ArtworkService,
    private readonly metadataService: MetadataPort,
    private readonly playlistRepository: PlaylistRepository,
    private readonly trackRepository: TrackRepository,
    private readonly trackPathService: FileSystemTrackPathPort,
    private readonly m3uService: M3uPort,
  ) {}

  /**
   * Handles metadata embedding, cover art saving
   * NOTE: Does NOT generate M3U. Call updatePlaylistM3u() after saving the track status.
   */
  async process(track: ITrack, trackFilePath: string): Promise<void> {
    try {
      const artwork = await this.artworkService.resolveTrackArtwork(track);

      // 1. Embed ID3 Tags (prefer specific track cover via artwork service)
      await this.metadataService.writeTags(trackFilePath, {
        title: track.name,
        artist: track.artist,
        albumArtist: track.albumArtist,
        album: track.album,
        albumYear: track.albumYear,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
        totalTracks: track.totalTracks,
        coverBuffer: artwork.tagCoverBuffer || undefined,
      });

      // 2. Save folder cover.jpg
      const trackDirectory = path.dirname(trackFilePath);
      await this.artworkService.saveAlbumCover(trackDirectory, artwork);

      // 3. Save Artist Image (if applicable)
      await this.artworkService.saveArtistImageIfNeeded(track, artwork);
    } catch (error) {
      console.error(
        `Error during post-processing for track ${track.name}: ${toErrorMessage(error)}`,
      );
      // We don't throw here to avoid failing the whole download if just metadata fails
    }
  }

  async updatePlaylistM3u(track: ITrack): Promise<void> {
    if (!track.playlistId) return;

    try {
      const playlistEntity = await this.playlistRepository.findOne(track.playlistId);

      // Only generate M3U for actual playlists
      if (!playlistEntity || !playlistEntity.name || playlistEntity.type !== "playlist") {
        return;
      }

      const playlist = playlistEntity.toPrimitive();
      const playlistTracksEntities = await this.trackRepository.findAllByPlaylist(track.playlistId);
      const playlistTracks = playlistTracksEntities.map((t) => t.toPrimitive());

      if (playlistTracks.length > 0) {
        const playlistFolderPath = this.trackPathService.getPlaylistFolderPath(playlist.name!);
        await this.m3uService.generateM3uFile(playlist, playlistTracks, playlistFolderPath);

        const completedCount = this.m3uService.getCompletedTracksCount(playlistTracks);
        console.debug(`Playlist M3U updated: ${completedCount}/${playlistTracks.length} tracks`);
      }
    } catch (err) {
      console.error(`Failed to generate M3U file: ${toErrorMessage(err)}`);
    }
  }
}
