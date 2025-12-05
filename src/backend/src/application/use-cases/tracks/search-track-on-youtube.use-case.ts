import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { EventBus } from "../../../domain/events/event-bus";
import { TrackRepository } from "../../../domain/repositories/track.repository";
import type { TrackQueueService } from "../../../domain/services/track-queue.service";
import { YoutubeSearchService } from "../../../infrastructure/external/youtube-search.service";
import { SettingsService } from "../../services/settings.service";

export class SearchTrackOnYoutubeUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeSearchService: YoutubeSearchService,
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

    existingTrack.markAsSearching();
    await this.trackRepository.update(track.id, existingTrack);
    this.eventBus.emit("playlists-updated");

    try {
      const youtubeUrl = await this.youtubeSearchService.findOnYoutubeOne(
        existingTrack.artist,
        existingTrack.name,
      );
      existingTrack.markAsQueued(youtubeUrl);
    } catch (error) {
      console.error(
        `Failed to find track on YouTube: ${existingTrack.artist} - ${existingTrack.name}`,
        error instanceof Error ? error.stack : String(error),
      );
      existingTrack.markAsError(error instanceof Error ? error.message : String(error));
    }

    await this.trackRepository.update(track.id, existingTrack);
    this.eventBus.emit("playlists-updated");

    if (existingTrack.youtubeUrl && existingTrack.status === TrackStatusEnum.Queued) {
      const maxRetries = await this.settingsService.getNumber("DOWNLOAD_MAX_RETRIES");
      const safeMaxRetries = maxRetries >= 1 && maxRetries <= 10 ? maxRetries : 3;
      await this.queueService.enqueueDownloadTrack(existingTrack.toPrimitive(), {
        maxRetries: safeMaxRetries,
      });
    }
  }
}
