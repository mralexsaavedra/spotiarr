import { AppError } from "@/domain/errors/app-error";
import type { TrackRepository } from "@/domain/repositories/track.repository";
import type { TrackQueueService } from "@/domain/services/track-queue.service";

export class RetryTrackDownloadUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly queueService: TrackQueueService,
  ) {}

  async execute(id: string): Promise<void> {
    const track = await this.trackRepository.findOneWithPlaylist(id);
    if (!track) {
      throw new AppError(404, "track_not_found");
    }
    track.markAsNew();
    await this.trackRepository.update(id, track);
    await this.queueService.enqueueSearchTrack(track.toPrimitive());
  }
}
