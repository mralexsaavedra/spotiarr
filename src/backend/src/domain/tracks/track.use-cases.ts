import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { AppError } from "../../middleware/error-handler";
import { getTrackSearchQueue } from "../../setup/queues";
import type { TrackRepository } from "./track.repository";

export interface TrackUseCaseDependencies {
  repository: TrackRepository;
}

export class TrackUseCases {
  constructor(private readonly deps: TrackUseCaseDependencies) {}

  getAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    return this.deps.repository.findAll(where);
  }

  getAllByPlaylist(id: string): Promise<ITrack[]> {
    return this.deps.repository.findAllByPlaylist(id);
  }

  get(id: string): Promise<ITrack | null> {
    return this.deps.repository.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new AppError(404, "track_not_found");
    }

    await this.deps.repository.delete(id);
  }

  async create(track: Partial<ITrack>): Promise<void> {
    const savedTrack = await this.deps.repository.save(track as ITrack);

    await getTrackSearchQueue().add("search-track", savedTrack, {
      jobId: `id-${savedTrack.id}`,
    });
  }

  async update(id: string, track: Partial<ITrack>): Promise<void> {
    await this.deps.repository.update(id, track);
  }

  async retry(id: string): Promise<void> {
    const track = await this.deps.repository.findOneWithPlaylist(id);
    if (!track) {
      throw new AppError(404, "track_not_found");
    }

    await getTrackSearchQueue().add("search-track", track, {
      jobId: `id-${id}`,
    });

    await this.update(id, { status: TrackStatusEnum.New });
  }
}
