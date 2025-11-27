import { TrackEntity } from "../entities/track.entity";

export interface ITrackRepository {
  findAll(
    where?: Record<string, unknown>,
    relations?: Record<string, boolean>,
  ): Promise<TrackEntity[]>;

  findAllByPlaylist(playlistId: string): Promise<TrackEntity[]>;

  findOne(id: string): Promise<TrackEntity | null>;

  save(track: TrackEntity): Promise<TrackEntity>;

  update(id: string, track: Partial<TrackEntity>): Promise<void>;

  delete(id: string): Promise<void>;
}
