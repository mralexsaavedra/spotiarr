import { PlaylistEntity } from './playlist.entity';

export interface IPlaylistRepository {
  findAll(
    relations?: Record<string, boolean>,
    where?: Partial<PlaylistEntity>,
  ): Promise<PlaylistEntity[]>;

  findOne(id: number): Promise<PlaylistEntity | null>;

  save(playlist: PlaylistEntity): Promise<PlaylistEntity>;

  update(id: number, playlist: Partial<PlaylistEntity>): Promise<void>;

  delete(id: number): Promise<void>;
}
