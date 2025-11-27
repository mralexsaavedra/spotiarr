import type { TrackEntity } from "../../entities/track.entity";

// Domain-level repository interface for tracks. This is intentionally
// infrastructure-agnostic and does not depend on TypeORM specifics.
export interface TrackRepository {
  findAll(where?: Partial<TrackEntity>): Promise<TrackEntity[]>;

  findAllByPlaylist(playlistId: string): Promise<TrackEntity[]>;

  findOne(id: string): Promise<TrackEntity | null>;

  findOneWithPlaylist(id: string): Promise<TrackEntity | null>;

  save(track: TrackEntity): Promise<TrackEntity>;

  update(id: string, track: Partial<TrackEntity>): Promise<void>;

  delete(id: string): Promise<void>;

  deleteAll(ids: string[]): Promise<void>;
}
