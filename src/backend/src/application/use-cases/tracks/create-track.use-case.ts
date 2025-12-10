import type { ITrack } from "@spotiarr/shared";
import type { TrackRepository } from "@/domain/repositories/track.repository";
import type { TrackQueueService } from "@/domain/services/track-queue.service";

export class CreateTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly queueService: TrackQueueService,
  ) {}

  async execute(track: Partial<ITrack>): Promise<void> {
    const savedTrack = await this.trackRepository.save(track as ITrack);
    await this.queueService.enqueueSearchTrack(savedTrack.toPrimitive());
  }
}
