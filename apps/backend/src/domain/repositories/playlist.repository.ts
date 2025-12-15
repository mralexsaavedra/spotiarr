import type { IPlaylist } from "@spotiarr/shared";
import { Playlist } from "../entities/playlist.entity";

export interface PlaylistRepository {
  findAll(includesTracks?: boolean, where?: Partial<IPlaylist>): Promise<Playlist[]>;

  findOne(id: string): Promise<Playlist | null>;

  save(playlist: IPlaylist | Playlist): Promise<Playlist>;

  update(id: string, playlist: Partial<IPlaylist> | Playlist): Promise<void>;

  delete(id: string): Promise<void>;
}
