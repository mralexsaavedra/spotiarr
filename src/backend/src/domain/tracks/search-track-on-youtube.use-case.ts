import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { emitSseEvent } from "routes/events.routes";
import { SettingsService } from "services/settings.service";
import { YoutubeService } from "services/youtube.service";
import { getTrackDownloadQueue } from "setup/queues";
import { TrackRepository } from "./track.repository";

export class SearchTrackOnYoutubeUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeService: YoutubeService,
    private readonly settingsService: SettingsService,
  ) {}

  async execute(track: ITrack): Promise<void> {
    if (!track.id) {
      return;
    }

    const existingTrack = await this.trackRepository.findOneWithPlaylist(track.id);
    if (!existingTrack) {
      return;
    }

    await this.trackRepository.update(track.id, {
      ...existingTrack,
      status: TrackStatusEnum.Searching,
    });
    emitSseEvent("playlists-updated");

    let updatedTrack: ITrack;

    try {
      const youtubeUrl = await this.youtubeService.findOnYoutubeOne(
        existingTrack.artist,
        existingTrack.name,
      );
      updatedTrack = { ...existingTrack, youtubeUrl, status: TrackStatusEnum.Queued };
    } catch (error) {
      console.error(
        `Failed to find track on YouTube: ${existingTrack.artist} - ${existingTrack.name}`,
        error instanceof Error ? error.stack : String(error),
      );
      updatedTrack = {
        ...existingTrack,
        error: error instanceof Error ? error.message : String(error),
        status: TrackStatusEnum.Error,
      };
    }

    await this.trackRepository.update(track.id, updatedTrack);
    emitSseEvent("playlists-updated");

    if (updatedTrack.youtubeUrl && updatedTrack.status === TrackStatusEnum.Queued) {
      const maxRetries = await this.settingsService.getNumber("DOWNLOAD_MAX_RETRIES");
      const safeMaxRetries = maxRetries >= 1 && maxRetries <= 10 ? maxRetries : 3;

      const jobId = `download-${updatedTrack.id}-${Date.now()}`;
      await getTrackDownloadQueue().add("download-track", updatedTrack, {
        jobId,
        attempts: safeMaxRetries,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }
  }
}
