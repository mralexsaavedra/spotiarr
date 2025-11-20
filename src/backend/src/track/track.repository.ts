import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackEntity } from './track.entity';
import { ITrackRepository } from './track.repository.interface';

@Injectable()
export class TrackRepository implements ITrackRepository {
  constructor(
    @InjectRepository(TrackEntity)
    private readonly repository: Repository<TrackEntity>,
  ) {}

  findAll(
    where?: { [key: string]: any },
    relations: Record<string, boolean> = {},
  ): Promise<TrackEntity[]> {
    return this.repository.find({ where, relations });
  }

  findAllByPlaylist(playlistId: number): Promise<TrackEntity[]> {
    return this.repository.find({ where: { playlist: { id: playlistId } } });
  }

  findOne(id: number): Promise<TrackEntity | null> {
    return this.repository.findOne({ where: { id }, relations: ['playlist'] });
  }

  save(track: TrackEntity): Promise<TrackEntity> {
    return this.repository.save(track);
  }

  async update(id: number, track: Partial<TrackEntity>): Promise<void> {
    await this.repository.update(id, track);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
