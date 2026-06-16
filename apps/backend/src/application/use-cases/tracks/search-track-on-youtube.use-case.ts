import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { YoutubeSearchPort } from "@/application/ports/youtube.port";
import { EventBus } from "@/domain/events/event-bus";
import { TrackRepository } from "@/domain/repositories/track.repository";
import type { TrackQueueService } from "@/domain/services/track-queue.service";

const DEFAULT_SEARCH_MAX_ATTEMPTS = 5;

export class SearchTrackOnYoutubeUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeSearchService: YoutubeSearchPort,
    private readonly settingsService: SettingsPort,
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

    const maxAttempts = await this.settingsService.getNumber("SEARCH_MAX_ATTEMPTS");
    const safeMaxAttempts = maxAttempts >= 1 ? maxAttempts : DEFAULT_SEARCH_MAX_ATTEMPTS;

    if (existingTrack.searchAttempts >= safeMaxAttempts) {
      existingTrack.markAsError(existingTrack.toPrimitive().error || "search_attempts_exceeded");
      await this.trackRepository.update(track.id, existingTrack);
      this.eventBus.emit("playlists-updated");
      return;
    }

    // If a YouTube URL is already set (e.g. manually overridden), skip the search.
    if (existingTrack.youtubeUrl) {
      existingTrack.markAsQueued(existingTrack.youtubeUrl);
    } else {
      existingTrack.markAsSearching();
      await this.trackRepository.update(track.id, existingTrack);
      this.eventBus.emit("playlists-updated");

      try {
        const youtubeUrl = await this.youtubeSearchService.findOnYoutubeOne(
          existingTrack.artist,
          existingTrack.name,
        );
        if (youtubeUrl) {
          existingTrack.markAsQueued(youtubeUrl);
        } else {
          existingTrack.markAsError("youtube_not_found");
        }
      } catch (error) {
        console.error(
          `Failed to find track on YouTube: ${existingTrack.artist} - ${existingTrack.name}`,
          error instanceof Error ? error.stack : String(error),
        );
        existingTrack.markAsError(error instanceof Error ? error.message : String(error));
      }
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
