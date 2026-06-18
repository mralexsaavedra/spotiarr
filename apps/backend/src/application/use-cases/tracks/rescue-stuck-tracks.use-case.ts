import { TrackStatusEnum } from "@spotiarr/shared";
import type { TrackRepository } from "@/domain/repositories/track.repository";
import { logger } from "@/infrastructure/logging/logger";
import type { RetryTrackDownloadUseCase } from "./retry-track-download.use-case";

const log = logger.child({ component: "rescue-stuck-tracks" });

export class RescueStuckTracksUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly retryTrackDownloadUseCase: RetryTrackDownloadUseCase,
  ) {}

  async execute(): Promise<void> {
    log.info("Checking for stuck tracks");

    const stuckStatuses = [
      TrackStatusEnum.New,
      TrackStatusEnum.Downloading,
      TrackStatusEnum.Searching,
      TrackStatusEnum.Queued,
    ];

    const stuckTracks = await this.trackRepository.findAllByStatuses(stuckStatuses);

    if (stuckTracks.length === 0) {
      log.info("No stuck tracks found");
      return;
    }

    log.info({ count: stuckTracks.length }, "Found stuck tracks, rescuing");

    let rescuedCount = 0;
    for (const track of stuckTracks) {
      if (!track.id || !track.status) continue;

      try {
        log.info(
          { trackId: track.id, artist: track.artist, name: track.name, status: track.status },
          "Rescuing stuck track",
        );
        await this.retryTrackDownloadUseCase.execute(track.id);
        rescuedCount++;
      } catch (error) {
        log.error({ err: error, trackId: track.id }, "Failed to rescue track");
      }
    }

    log.info({ rescued: rescuedCount, total: stuckTracks.length }, "Rescue complete");
  }
}
