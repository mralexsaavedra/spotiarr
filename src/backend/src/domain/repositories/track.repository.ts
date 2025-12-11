import type { ITrack, TrackStatusEnum } from "@spotiarr/shared";
import { Track } from "../entities/track.entity";

export interface TrackRepository {
  findAll(where?: Partial<ITrack>): Promise<Track[]>;

  findAllByPlaylist(playlistId: string): Promise<Track[]>;

  findOne(id: string): Promise<Track | null>;

  findOneWithPlaylist(id: string): Promise<Track | null>;

  save(track: ITrack | Track): Promise<Track>;

  update(id: string, track: Partial<ITrack> | Track): Promise<void>;

  delete(id: string): Promise<void>;

  deleteAll(ids: string[]): Promise<void>;

  findStuckTracks(statuses: TrackStatusEnum[], createdBefore: number): Promise<Track[]>;

  findAllByStatuses(statuses: TrackStatusEnum[]): Promise<Track[]>;
}
