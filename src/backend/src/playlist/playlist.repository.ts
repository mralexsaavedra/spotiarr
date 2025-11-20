import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaylistEntity } from './playlist.entity';
import { IPlaylistRepository } from './playlist.repository.interface';

@Injectable()
export class PlaylistRepository implements IPlaylistRepository {
  constructor(
    @InjectRepository(PlaylistEntity)
    private readonly repository: Repository<PlaylistEntity>,
  ) {}

  findAll(
    relations: Record<string, boolean> = { tracks: true },
    where?: Partial<PlaylistEntity>,
  ): Promise<PlaylistEntity[]> {
    return this.repository.find({ where, relations });
  }

  findOne(id: number): Promise<PlaylistEntity | null> {
    return this.repository.findOneBy({ id });
  }

  save(playlist: PlaylistEntity): Promise<PlaylistEntity> {
    return this.repository.save(playlist);
  }

  async update(id: number, playlist: Partial<PlaylistEntity>): Promise<void> {
    await this.repository.update(id, playlist);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
