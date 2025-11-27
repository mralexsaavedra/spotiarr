import type { IPlaylist } from "@spotiarr/shared";

export interface PlaylistRepository {
  findAll(includesTracks?: boolean, where?: Partial<IPlaylist>): Promise<IPlaylist[]>;

  findOne(id: string): Promise<IPlaylist | null>;

  save(playlist: IPlaylist): Promise<IPlaylist>;

  update(id: string, playlist: Partial<IPlaylist>): Promise<void>;

  delete(id: string): Promise<void>;
}
