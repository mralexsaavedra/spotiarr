import type { IPlaylist } from "@spotiarr/shared";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";

export class GetPlaylistsUseCase {
  constructor(private readonly playlistRepository: PlaylistRepository) {}

  async findAll(includesTracks = true, where?: Partial<IPlaylist>): Promise<IPlaylist[]> {
    const playlists = await this.playlistRepository.findAll(includesTracks, where);
    return playlists.map((p) => p.toPrimitive());
  }

  async findOne(id: string): Promise<IPlaylist | null> {
    const playlist = await this.playlistRepository.findOne(id);
    return playlist ? playlist.toPrimitive() : null;
  }
}
