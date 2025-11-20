import { TrackEntity } from './track.entity';

export interface ITrackRepository {
  findAll(
    where?: { [key: string]: any },
    relations?: Record<string, boolean>,
  ): Promise<TrackEntity[]>;

  findAllByPlaylist(playlistId: number): Promise<TrackEntity[]>;

  findOne(id: number): Promise<TrackEntity | null>;

  save(track: TrackEntity): Promise<TrackEntity>;

  update(id: number, track: Partial<TrackEntity>): Promise<void>;

  delete(id: number): Promise<void>;
}
