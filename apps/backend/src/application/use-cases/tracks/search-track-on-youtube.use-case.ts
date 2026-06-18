import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { YoutubeSearchPort } from "@/application/ports/youtube.port";
import { EventBus } from "@/domain/events/event-bus";
import { TrackRepository } from "@/domain/repositories/track.repository";
import type { TrackQueueService } from "@/domain/services/track-queue.service";
import { logger } from "@/infrastructure/logging/logger";

const log = logger.child({ component: "search-track-on-youtube" });

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

    const maxAttempts = await this.settingsService.getNumber(
      "SEARCH_MAX_ATTEMPTS",
      DEFAULT_SEARCH_MAX_ATTEMPTS,
    );
    const safeMaxAttempts = maxAttempts >= 1 ? maxAttempts : DEFAULT_SEARCH_MAX_ATTEMPTS;

    // Stop re-driving when the failure is permanent: a known-terminal error
    // code (e.g. youtube_not_found) is deterministic, so don't burn the
    // attempt budget re-searching for it; transient errors get re-tried up to
    // the cap and then settle into a stable terminal Error.
    const capReached = existingTrack.searchAttempts >= safeMaxAttempts;
    if (existingTrack.isTerminalError() || capReached) {
      existingTrack.markAsError(
        capReached
          ? "search_attempts_exceeded"
          : existingTrack.toPrimitive().error || "search_attempts_exceeded",
      );
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
        log.error(
          { err: error, artist: existingTrack.artist, name: existingTrack.name },
          "Failed to find track on YouTube",
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
