import { AppError } from "@/domain/errors/app-error";
import type { TrackRepository } from "@/domain/repositories/track.repository";

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
