import { TrackStatusEnum } from "@spotiarr/shared";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { SpotifyCircuitBreakerPort } from "@/application/ports/spotify-circuit-breaker.port";
import { EventBus } from "@/domain/events/event-bus";
import type { TrackRepository } from "@/domain/repositories/track.repository";
import type { RetryTrackDownloadUseCase } from "./retry-track-download.use-case";

const DEFAULT_SEARCH_MAX_ATTEMPTS = 5;

export class RecoverErroredTracksUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly retryTrackDownloadUseCase: RetryTrackDownloadUseCase,
    private readonly spotifyCircuitBreaker: SpotifyCircuitBreakerPort,
    private readonly settingsService: SettingsPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(): Promise<void> {
    if (this.spotifyCircuitBreaker.isOpen()) {
      console.warn(
        "[RecoverErroredTracks] Skipping run — Spotify circuit breaker is open. Tracks remain in Error and will be retried on next tick.",
      );
      return;
    }

    const erroredTracks = await this.trackRepository.findAllByStatuses([TrackStatusEnum.Error]);

    const maxAttempts = await this.settingsService.getNumber("SEARCH_MAX_ATTEMPTS");
    const safeMaxAttempts = maxAttempts >= 1 ? maxAttempts : DEFAULT_SEARCH_MAX_ATTEMPTS;

    let recovered = 0;
    for (const track of erroredTracks) {
      if (!track.id) continue;

      if (track.isTerminalError() || track.searchAttempts >= safeMaxAttempts) {
        continue;
      }

      await this.retryTrackDownloadUseCase.execute(track.id);
      recovered++;
    }

    if (recovered > 0) {
      this.eventBus.emit("playlists-updated");
    }
  }
}
