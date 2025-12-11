import { PlaylistTypeEnum, type ITrack } from "@spotiarr/shared";
import * as fs from "fs";
import * as path from "path";
import { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { TrackRepository } from "@/domain/repositories/track.repository";
import { SpotifyService } from "@/domain/services/spotify.service";
import { FileSystemM3uService } from "@/infrastructure/services/file-system-m3u.service";
import { FileSystemTrackPathService } from "@/infrastructure/services/file-system-track-path.service";
import { MetadataService } from "@/infrastructure/services/metadata.service";
import { getErrorMessage } from "@/infrastructure/utils/error.utils";

export class TrackPostProcessingService {
  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly metadataService: MetadataService,
    private readonly playlistRepository: PlaylistRepository,
    private readonly trackRepository: TrackRepository,
    private readonly trackPathService: FileSystemTrackPathService,
    private readonly m3uService: FileSystemM3uService,
  ) {}

  /**
   * Handles metadata embedding, cover art saving
   * NOTE: Does NOT generate M3U. Call updatePlaylistM3u() after saving the track status.
   */
  async process(track: ITrack, trackFilePath: string): Promise<void> {
    try {
      const { trackCoverUrl, playlistCoverUrl, isPlaylistType } = await this.getCoverUrls(track);

      // 1. Embed ID3 Tags (prefer specific track cover)
      await this.metadataService.addImage(
        trackFilePath,
        trackCoverUrl || playlistCoverUrl || "",
        track.name,
        track.artist,
        track.albumYear,
        track.trackNumber,
      );

      // 2. Save folder cover.jpg
      const trackDirectory = path.dirname(trackFilePath);
      const folderCoverUrl = isPlaylistType ? playlistCoverUrl : trackCoverUrl;

      if (folderCoverUrl) {
        await this.metadataService.saveCoverArt(trackDirectory, folderCoverUrl);
      }

      // 3. Save Artist Image (if applicable)
      await this.saveArtistImageIfNeeded(track);
    } catch (error) {
      console.error(
        `Error during post-processing for track ${track.name}: ${getErrorMessage(error)}`,
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
      console.error(`Failed to generate M3U file: ${getErrorMessage(err)}`);
    }
  }

  private async getCoverUrls(track: ITrack): Promise<{
    trackCoverUrl: string;
    playlistCoverUrl?: string;
    isPlaylistType: boolean;
  }> {
    let playlistCoverUrl: string | undefined;
    let isPlaylistType = false;

    // Get Playlist Info
    if (track.playlistId) {
      const playlist = await this.playlistRepository.findOne(track.playlistId);
      isPlaylistType = playlist?.type === "playlist";
      if (playlist) {
        playlistCoverUrl = playlist.coverUrl;
      }
    }

    // Get Specific Track Cover from Spotify
    let trackCoverUrl = "";
    const urlToUse = track.spotifyUrl || track.trackUrl;

    if (urlToUse) {
      try {
        const details = await this.spotifyService.getPlaylistDetail(urlToUse);
        trackCoverUrl = details.image;
      } catch (e) {
        console.warn(`Failed to fetch cover for track ${track.name}: ${getErrorMessage(e)}`);
      }
    }

    return { trackCoverUrl, playlistCoverUrl, isPlaylistType };
  }

  private async saveArtistImageIfNeeded(track: ITrack): Promise<void> {
    if (!track.playlistId) return;

    try {
      const playlist = await this.playlistRepository.findOne(track.playlistId);

      // Only save artist image if it's NOT a generic playlist and we have an image
      if (playlist && playlist.type !== PlaylistTypeEnum.Playlist && playlist.artistImageUrl) {
        const artistFolderPath = this.trackPathService.getArtistFolderPath(track.artist);

        if (!fs.existsSync(artistFolderPath)) {
          fs.mkdirSync(artistFolderPath, { recursive: true });
        }

        await this.metadataService.saveCoverArt(
          artistFolderPath,
          playlist.artistImageUrl,
          "cover.jpg",
        );
      }
    } catch (error) {
      console.warn(`Failed to save artist image: ${getErrorMessage(error)}`);
    }
  }
}
