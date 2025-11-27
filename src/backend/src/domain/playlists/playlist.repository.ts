import type { PlaylistEntity } from "../../entities/playlist.entity";

// Domain-level repository interface for playlists. This is intentionally
// infrastructure-agnostic and does not depend on TypeORM specifics.
export interface PlaylistRepository {
  findAll(
    relations?: Record<string, boolean>,
    where?: Partial<PlaylistEntity>,
  ): Promise<PlaylistEntity[]>;

  findOne(id: string): Promise<PlaylistEntity | null>;

  save(playlist: PlaylistEntity): Promise<PlaylistEntity>;

  update(id: string, playlist: Partial<PlaylistEntity>): Promise<void>;

  delete(id: string): Promise<void>;
}
