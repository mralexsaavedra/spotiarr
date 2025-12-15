import { TrackStatusEnum } from "@spotiarr/shared";
import type { TrackRepository } from "@/domain/repositories/track.repository";
import type { RetryTrackDownloadUseCase } from "./retry-track-download.use-case";

export class RescueStuckTracksUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly retryTrackDownloadUseCase: RetryTrackDownloadUseCase,
  ) {}

  async execute(): Promise<void> {
    console.log("🚑 Checking for stuck tracks...");

    const stuckStatuses = [
      TrackStatusEnum.Downloading,
      TrackStatusEnum.Searching,
      TrackStatusEnum.Queued,
    ];

    const stuckTracks = await this.trackRepository.findAllByStatuses(stuckStatuses);

    if (stuckTracks.length === 0) {
      console.log("✅ No stuck tracks found.");
      return;
    }

    console.log(`⚠️ Found ${stuckTracks.length} stuck tracks. Rescuing...`);

    let rescuedCount = 0;
    for (const track of stuckTracks) {
      if (!track.id || !track.status) continue;

      try {
        console.log(`🔄 Rescuing track: ${track.artist} - ${track.name} [${track.status}]`);
        await this.retryTrackDownloadUseCase.execute(track.id);
        rescuedCount++;
      } catch (error) {
        console.error(
          `❌ Failed to rescue track ${track.id}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    console.log(`✅ Rescued ${rescuedCount}/${stuckTracks.length} tracks.`);
  }
}
