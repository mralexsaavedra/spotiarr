import { PlaylistTypeEnum, type ITrack } from "@spotiarr/shared";
import * as fs from "fs";
import * as path from "path";
import { EventBus } from "../../../domain/events/event-bus";
import { HistoryRepository } from "../../../domain/repositories/history.repository";
import { PlaylistRepository } from "../../../domain/repositories/playlist.repository";
import { TrackRepository } from "../../../domain/repositories/track.repository";
import { SpotifyService } from "../../../infrastructure/external/spotify.service";
import { YoutubeService } from "../../../infrastructure/external/youtube.service";
import { FileSystemFileSystemM3uService } from "../../../infrastructure/services/file-system-m3u.service";
import { FileSystemTrackPathService } from "../../../infrastructure/services/file-system-track-path.service";
import { UtilsService } from "../../services/utils.service";

export class DownloadTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeService: YoutubeService,
    private readonly m3uService: FileSystemFileSystemM3uService,
    private readonly utilsService: UtilsService,
    private readonly trackFileHelper: FileSystemTrackPathService,
    private readonly playlistRepository: PlaylistRepository,
    private readonly spotifyService: SpotifyService,
    private readonly downloadHistoryRepository: HistoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(trackData: ITrack): Promise<void> {
    // Validate track exists and get Entity
    if (!trackData.id) return;
    const track = await this.trackRepository.findOne(trackData.id);

    if (!track || !track.id) {
      return;
    }

    // Validate required fields
    this.validateTrack(track.toPrimitive());

    // Update status to Downloading
    track.markAsDownloading();
    await this.trackRepository.update(track.id, track);
    this.eventBus.emit("playlists-updated");

    let error: string | undefined;

    try {
      await this.downloadAndProcessTrack(track.toPrimitive());
    } catch (err) {
      console.error(
        `Failed to download track: ${track.artist} - ${track.name}`,
        err instanceof Error ? err.stack : String(err),
      );
      error = err instanceof Error ? err.message : String(err);
    }

    // Update final status
    if (error) {
      track.markAsError(error);
    } else {
      track.markAsCompleted();
    }

    await this.trackRepository.update(track.id, track);

    // Persist in download history when successful
    if (!error) {
      // We need playlist info; reload with relations so playlist is present
      // Note: findOneWithPlaylist returns Track entity now
      const persistedTrack = await this.trackRepository.findOneWithPlaylist(track.id);
      if (persistedTrack) {
        // downloadHistoryRepository likely expects ITrack, check this later.
        // Assuming it expects ITrack for now as we haven't touched it.
        await this.downloadHistoryRepository.createFromTrack(persistedTrack.toPrimitive());
        this.eventBus.emit("download-history-updated");
      }
    }

    // Generate M3U if successful
    if (!error && track.playlistId) {
      await this.generateM3uIfNeeded(track.toPrimitive());
    }

    // Notify playlists have changed (track status affects playlist state)
    this.eventBus.emit("playlists-updated");
  }

  private validateTrack(track: ITrack): void {
    if (!track.name || !track.artist) {
      const errorMsg = `Track field is null or undefined: name=${track.name}, artist=${track.artist}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  private async downloadAndProcessTrack(track: ITrack): Promise<void> {
    let playlistName: string | undefined;
    let playlistCoverUrl: string | undefined;
    let isPlaylistType = false;

    if (track.playlistId) {
      const playlist = await this.playlistRepository.findOne(track.playlistId);
      // Check if it's strictly a playlist (not artist or album download)
      isPlaylistType = playlist?.type === "playlist";
      if (playlist) {
        playlistCoverUrl = playlist.coverUrl;
        if (isPlaylistType) {
          playlistName = playlist.name;
        }
      }
    }

    const trackFilePath = await this.trackFileHelper.getFolderName(track, playlistName);
    const trackDirectory = path.dirname(trackFilePath);

    // Create directory structure
    if (!fs.existsSync(trackDirectory)) {
      fs.mkdirSync(trackDirectory, { recursive: true });
    }

    await this.youtubeService.downloadAndFormat(track, trackFilePath);

    // Fetch specific track cover image (Album Cover) from Spotify
    let trackCoverUrl = "";
    const urlToUse = track.spotifyUrl || track.trackUrl;

    if (urlToUse) {
      try {
        const details = await this.spotifyService.getPlaylistDetail(urlToUse);
        trackCoverUrl = details.image;
      } catch (e) {
        console.warn(`Failed to fetch cover for track ${track.name}`, e);
      }
    }

    // Embed ID3 cover (prefer specific track cover)
    await this.youtubeService.addImage(
      trackFilePath,
      trackCoverUrl || playlistCoverUrl || "",
      track.name,
      track.artist,
      track.albumYear,
      track.trackNumber,
    );

    // Save folder cover.jpg
    // If it's a playlist, use the playlist cover.
    // If it's an artist/album/track download, use the track (album) cover.
    const folderCoverUrl = isPlaylistType ? playlistCoverUrl : trackCoverUrl;
    if (folderCoverUrl) {
      await this.youtubeService.saveCoverArt(trackDirectory, folderCoverUrl);
    }

    // If it's not a Playlist (Artist, Album, or Track), save the artist image in the artist folder
    if (track.playlistId) {
      const playlist = await this.playlistRepository.findOne(track.playlistId);

      console.debug(
        `Checking artist cover for playlist ${track.playlistId}: type=${playlist?.type}, hasImage=${!!playlist?.artistImageUrl}`,
      );

      if (playlist && playlist.type !== PlaylistTypeEnum.Playlist && playlist.artistImageUrl) {
        const artistFolderPath = this.utilsService.getArtistFolderPath(track.artist);
        console.debug(`Saving artist cover to ${artistFolderPath}`);

        // Ensure artist folder exists
        if (!fs.existsSync(artistFolderPath)) {
          fs.mkdirSync(artistFolderPath, { recursive: true });
        }
        await this.youtubeService.saveCoverArt(
          artistFolderPath,
          playlist.artistImageUrl,
          "cover.jpg",
        );
      }
    }
  }

  private async generateM3uIfNeeded(track: ITrack): Promise<void> {
    if (!track.playlistId) {
      return;
    }

    try {
      const playlistEntity = await this.playlistRepository.findOne(track.playlistId);
      // Only generate M3U for actual playlists
      if (!playlistEntity || !playlistEntity.name || playlistEntity.type !== "playlist") {
        return;
      }
      const playlist = playlistEntity.toPrimitive();

      const playlistTracksEntities = await this.trackRepository.findAllByPlaylist(track.playlistId);
      const playlistTracks = playlistTracksEntities.map((t) => t.toPrimitive());
      const hasMultipleTracks = playlistTracks.length > 0;

      if (hasMultipleTracks) {
        const playlistFolderPath = this.utilsService.getPlaylistFolderPath(playlist.name!);
        await this.m3uService.generateM3uFile(playlist, playlistTracks, playlistFolderPath);

        const completedCount = this.m3uService.getCompletedTracksCount(playlistTracks);
        const totalCount = playlistTracks.length;
        console.debug(`Playlist: ${completedCount}/${totalCount} tracks completed`);
      }
    } catch (err) {
      console.error("Failed to generate M3U file", err instanceof Error ? err.stack : String(err));
    }
  }
}
