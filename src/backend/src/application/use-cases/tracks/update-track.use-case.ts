import type { ITrack } from "@spotiarr/shared";
import type { TrackRepository } from "../../../domain/repositories/track.repository";

export class UpdateTrackUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  async execute(id: string, track: Partial<ITrack>): Promise<void> {
    await this.trackRepository.update(id, track);
  }
}
