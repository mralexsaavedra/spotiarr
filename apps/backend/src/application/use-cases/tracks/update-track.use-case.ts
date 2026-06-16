import type { ITrack, TrackStatusEnum } from "@spotiarr/shared";
import type { TrackRepository } from "@/domain/repositories/track.repository";

export class UpdateTrackUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  async execute(id: string, track: Partial<ITrack>): Promise<void> {
    await this.trackRepository.update(id, track);
  }

  /**
   * Conditional (CAS) update: applies the patch only if the track is still in
   * `expectedStatus`. Returns false if the row moved on in the meantime, so a
   * background writer (e.g. the stuck-tracks killer) cannot clobber a track
   * that legitimately progressed between the read and the write.
   */
  async executeIfStatus(
    id: string,
    expectedStatus: TrackStatusEnum,
    patch: Partial<ITrack>,
  ): Promise<boolean> {
    return this.trackRepository.updateStatusIf(id, expectedStatus, patch);
  }
}
