import type { ITrack } from "@spotiarr/shared";
import type { TrackRepository } from "../../../domain/interfaces/track.repository";

export class GetTracksUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  async getAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    return this.trackRepository.findAll(where);
  }

  async getAllByPlaylist(id: string): Promise<ITrack[]> {
    return this.trackRepository.findAllByPlaylist(id);
  }

  async get(id: string): Promise<ITrack | null> {
    return this.trackRepository.findOne(id);
  }
}
