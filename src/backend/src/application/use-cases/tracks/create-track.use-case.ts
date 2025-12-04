import type { ITrack } from "@spotiarr/shared";
import type { TrackQueueService } from "../../../domain/interfaces/track-queue.interface";
import type { TrackRepository } from "../../../domain/repositories/track.repository";

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
