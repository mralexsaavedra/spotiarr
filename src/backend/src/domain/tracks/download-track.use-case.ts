import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import * as fs from "fs";
import { TrackFileHelper } from "helpers/track-file.helper";
import * as path from "path";
import { PrismaHistoryRepository } from "repositories/prisma-history.repository";
import { emitSseEvent } from "routes/events.routes";
import { M3uService } from "services/m3u.service";
import { UtilsService } from "services/utils.service";
import { YoutubeService } from "services/youtube.service";
import { TrackRepository } from "./track.repository";

export class DownloadTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeService: YoutubeService,
    private readonly m3uService: M3uService,
    private readonly utilsService: UtilsService,
    private readonly trackFileHelper: TrackFileHelper,
    private readonly downloadHistoryRepository: PrismaHistoryRepository = new PrismaHistoryRepository(),
  ) {}

  async execute(track: ITrack): Promise<void> {
    // Validate track exists
    if (!track.id || !(await this.trackRepository.findOne(track.id))) {
      return;
    }

    // Validate required fields
    this.validateTrack(track);

    // Update status to Downloading
    await this.trackRepository.update(track.id, {
      ...track,
      status: TrackStatusEnum.Downloading,
    });
    emitSseEvent("playlists-updated");

    let error: string | undefined;

    try {
      await this.downloadAndProcessTrack(track);
    } catch (err) {
      console.error(
        `Failed to download track: ${track.artist} - ${track.name}`,
        err instanceof Error ? err.stack : String(err),
      );
      error = err instanceof Error ? err.message : String(err);
    }

    // Update final status
    const updatedTrack = {
      ...track,
      status: error ? TrackStatusEnum.Error : TrackStatusEnum.Completed,
      ...(error ? { error } : {}),
      ...(!error ? { completedAt: Date.now() } : {}),
    };

    await this.trackRepository.update(track.id, updatedTrack);

    // Persist in download history when successful
    if (!error) {
      // We need playlist info; reload with relations so playlist is present
      const persistedTrack = await this.trackRepository.findOneWithPlaylist(track.id);
      if (persistedTrack && persistedTrack.completedAt) {
        await this.downloadHistoryRepository.createFromTrack(persistedTrack);
        emitSseEvent("download-history-updated");
      }
    }

    // Generate M3U if successful
    if (!error && track.playlistId) {
      await this.generateM3uIfNeeded(track);
    }

    // Notify playlists have changed (track status affects playlist state)
    emitSseEvent("playlists-updated");
  }

  private validateTrack(track: ITrack): void {
    if (!track.name || !track.artist) {
      const errorMsg = `Track field is null or undefined: name=${track.name}, artist=${track.artist}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  private async downloadAndProcessTrack(track: ITrack): Promise<void> {
    const trackFilePath = await this.trackFileHelper.getFolderName(track);
    const trackDirectory = path.dirname(trackFilePath);

    // Create directory structure
    if (!fs.existsSync(trackDirectory)) {
      fs.mkdirSync(trackDirectory, { recursive: true });
    }

    await this.youtubeService.downloadAndFormat(track, trackFilePath);

    await this.youtubeService.addImage(
      trackFilePath,
      "",
      track.name,
      track.artist,
      track.albumYear,
    );
  }

  private async generateM3uIfNeeded(track: ITrack): Promise<void> {
    if (!track.playlistId) return;

    try {
      const playlistTracks = await this.trackRepository.findAllByPlaylist(track.playlistId);
      const hasMultipleTracks = playlistTracks.length > 1;

      if (hasMultipleTracks) {
        const completedCount = this.m3uService.getCompletedTracksCount(playlistTracks);
        const totalCount = playlistTracks.length;

        console.debug(`Playlist: ${completedCount}/${totalCount} tracks completed`);
      }
    } catch (err) {
      console.error("Failed to generate M3U file", err instanceof Error ? err.stack : String(err));
    }
  }
}
