import type { ITrack } from "@spotiarr/shared";
import type { TrackRepository } from "../../../domain/repositories/track.repository";

export class GetTracksUseCase {
  constructor(private readonly trackRepository: TrackRepository) {}

  async getAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    const tracks = await this.trackRepository.findAll(where);
    return tracks.map((t) => t.toPrimitive());
  }

  async getAllByPlaylist(id: string): Promise<ITrack[]> {
    const tracks = await this.trackRepository.findAllByPlaylist(id);
    return tracks.map((t) => t.toPrimitive());
  }

  async get(id: string): Promise<ITrack | null> {
    const track = await this.trackRepository.findOne(id);
    return track ? track.toPrimitive() : null;
  }
}
