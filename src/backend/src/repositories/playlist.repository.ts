import { Repository } from "typeorm";
import type { PlaylistRepository as DomainPlaylistRepository } from "../domain/playlists/playlist.repository";
import { PlaylistEntity } from "../entities/playlist.entity";
import { getDataSource } from "../setup/database";

export class PlaylistRepository implements DomainPlaylistRepository {
  private get repository(): Repository<PlaylistEntity> {
    return getDataSource().getRepository(PlaylistEntity);
  }

  findAll(
    relations: Record<string, boolean> = { tracks: true },
    where?: Partial<PlaylistEntity>,
  ): Promise<PlaylistEntity[]> {
    return this.repository.find({ where, relations });
  }

  findOne(id: string): Promise<PlaylistEntity | null> {
    return this.repository.findOneBy({ id });
  }

  save(playlist: PlaylistEntity): Promise<PlaylistEntity> {
    return this.repository.save(playlist);
  }

  async update(id: string, playlist: Partial<PlaylistEntity>): Promise<void> {
    await this.repository.update(id, playlist);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
