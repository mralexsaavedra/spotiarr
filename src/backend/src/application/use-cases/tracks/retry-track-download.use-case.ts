import type { TrackQueueService } from "../../../domain/interfaces/track-queue.interface";
import type { TrackRepository } from "../../../domain/interfaces/track.repository";
import { AppError } from "../../../presentation/middleware/error-handler";

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
