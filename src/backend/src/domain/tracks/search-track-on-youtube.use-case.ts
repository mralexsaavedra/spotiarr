import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { EventBus } from "../../domain/events/event-bus";
import { TrackRepository } from "../../domain/interfaces/track.repository";
import { SettingsService } from "../../services/settings.service";
import { YoutubeService } from "../../services/youtube.service";
import type { TrackQueueService } from "./track-queue.service";

export class SearchTrackOnYoutubeUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeService: YoutubeService,
    private readonly settingsService: SettingsService,
    private readonly queueService: TrackQueueService,
    private readonly eventBus: EventBus,
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
    this.eventBus.emit("playlists-updated");

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
    this.eventBus.emit("playlists-updated");

    if (updatedTrack.youtubeUrl && updatedTrack.status === TrackStatusEnum.Queued) {
      const maxRetries = await this.settingsService.getNumber("DOWNLOAD_MAX_RETRIES");
      const safeMaxRetries = maxRetries >= 1 && maxRetries <= 10 ? maxRetries : 3;
      await this.queueService.enqueueDownloadTrack(updatedTrack, { maxRetries: safeMaxRetries });
    }
  }
}
