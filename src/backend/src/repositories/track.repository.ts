import { Repository } from "typeorm";
import type { TrackRepository as DomainTrackRepository } from "../domain/tracks/track.repository";
import { TrackEntity } from "../entities/track.entity";
import { getDataSource } from "../setup/database";
import { ITrackRepository } from "./track.repository.interface";

export class TrackRepository implements ITrackRepository, DomainTrackRepository {
  private get repository(): Repository<TrackEntity> {
    return getDataSource().getRepository(TrackEntity);
  }

  findAll(where?: Partial<TrackEntity>): Promise<TrackEntity[]> {
    return this.repository.find({
      where,
      relations: { playlist: true },
    });
  }

  findAllByPlaylist(playlistId: string): Promise<TrackEntity[]> {
    return this.repository.find({
      where: { playlist: { id: playlistId } },
      relations: { playlist: true },
    });
  }

  findOne(id: string): Promise<TrackEntity | null> {
    return this.repository.findOneBy({ id });
  }

  findOneWithPlaylist(id: string): Promise<TrackEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: { playlist: true },
    });
  }

  save(track: TrackEntity): Promise<TrackEntity> {
    return this.repository.save(track);
  }

  async update(id: string, track: Partial<TrackEntity>): Promise<void> {
    await this.repository.update(id, track);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteAll(ids: string[]): Promise<void> {
    await this.repository.delete(ids);
  }
}
