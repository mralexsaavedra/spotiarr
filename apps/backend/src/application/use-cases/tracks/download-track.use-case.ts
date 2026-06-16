import { TrackStatusEnum, type ITrack, PlaylistTypeEnum } from "@spotiarr/shared";
import type { FileSystemTrackPathPort } from "@/application/ports/file-system.port";
import type { YoutubeDownloadPort } from "@/application/ports/youtube.port";
import { AppError } from "@/domain/errors/app-error";
import { EventBus } from "@/domain/events/event-bus";
import { HistoryRepository } from "@/domain/repositories/history.repository";
import { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { TrackRepository } from "@/domain/repositories/track.repository";
import { TrackPostProcessingService } from "../../services/track-post-processing.service";
import { getErrorMessage } from "../../utils/error.utils";

export class DownloadTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeDownloadService: YoutubeDownloadPort,
    private readonly trackFileHelper: FileSystemTrackPathPort,
    private readonly playlistRepository: PlaylistRepository,
    private readonly downloadHistoryRepository: HistoryRepository,
    private readonly eventBus: EventBus,
    private readonly trackPostProcessingService: TrackPostProcessingService,
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

    // CAS claim: only proceed if the track is not already Downloading
    const claimed = await this.trackRepository.markDownloadingIfNotAlready(track.id);
    if (!claimed) {
      return;
    }
    this.eventBus.emit("playlists-updated");

    let error: string | undefined;
    let durationMs: number | undefined;

    try {
      ({ durationMs } = await this.downloadAndProcessTrack(track.toPrimitive()));
    } catch (err) {
      console.error(
        `Failed to download track: ${track.artist} - ${track.name}`,
        getErrorMessage(err),
      );
      error = getErrorMessage(err);
    }

    // Terminal write via CAS so a stale writer cannot clobber a newer state
    if (error) {
      track.markAsError(error);
    } else {
      if (durationMs) {
        track.setDurationMs(durationMs);
      }
      track.markAsCompleted();
    }

    await this.trackRepository.updateStatusIf(
      track.id,
      TrackStatusEnum.Downloading,
      track.toPrimitive(),
    );

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

      // Generate M3U if successful (NOW SAFE: track is marked as completed in DB)
      // This fixes the issue where the current track was missing from M3U
      await this.trackPostProcessingService.updatePlaylistM3u(track.toPrimitive());
    }

    // Notify playlists have changed (track status affects playlist state)
    this.eventBus.emit("playlists-updated");
  }

  private validateTrack(track: ITrack): void {
    if (!track.name || !track.artist) {
      const errorMsg = `Track field is null or undefined: name=${track.name}, artist=${track.artist}`;
      console.error(errorMsg);
      throw new AppError(400, "internal_server_error", errorMsg);
    }
  }

  private async downloadAndProcessTrack(track: ITrack): Promise<{ durationMs?: number }> {
    let playlistName: string | undefined;

    if (track.playlistId) {
      const playlist = await this.playlistRepository.findOne(track.playlistId);
      // Playlist-like downloads live under Playlists/; album and artist downloads do not
      if (
        playlist &&
        (playlist.type === PlaylistTypeEnum.Playlist || playlist.type === PlaylistTypeEnum.Ai)
      ) {
        playlistName = playlist.name;
      }
    }

    const trackFilePath = await this.trackFileHelper.getFolderName(track, playlistName);
    await this.trackFileHelper.ensureParentDirectory(trackFilePath);

    // 1. Download Content
    const { durationMs } = await this.youtubeDownloadService.downloadAndFormat(
      track,
      trackFilePath,
    );

    // 2. Post-Processing (Metadata, Covers, M3U)
    // Delegated to dedicated service to keep Use Case clean
    await this.trackPostProcessingService.process(track, trackFilePath);

    return { durationMs };
  }
}
