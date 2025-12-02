import type { ITrack } from "@spotiarr/shared";

export interface TrackRepository {
  findAll(where?: Partial<ITrack>): Promise<ITrack[]>;

  findAllByPlaylist(playlistId: string): Promise<ITrack[]>;

  findOne(id: string): Promise<ITrack | null>;

  findOneWithPlaylist(id: string): Promise<ITrack | null>;

  save(track: ITrack): Promise<ITrack>;

  update(id: string, track: Partial<ITrack>): Promise<void>;

  delete(id: string): Promise<void>;

  deleteAll(ids: string[]): Promise<void>;
}
