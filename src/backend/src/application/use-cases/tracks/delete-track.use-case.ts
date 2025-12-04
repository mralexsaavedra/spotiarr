import type { TrackRepository } from "../../../domain/repositories/track.repository";
import { AppError } from "../../../presentation/middleware/error-handler";

export class DeleteTrackUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.trackRepository.findOne(id);
    if (!existing) {
      throw new AppError(404, "track_not_found");
    }

    await this.trackRepository.delete(id);
  }
}
