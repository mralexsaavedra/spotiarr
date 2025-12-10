import type { IPlaylist } from "@spotiarr/shared";
import { EventBus } from "@/domain/events/event-bus";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { AppError } from "@/presentation/middleware/error-handler";

export class UpdatePlaylistUseCase {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(id: string, playlist: Partial<IPlaylist>): Promise<void> {
    const existing = await this.playlistRepository.findOne(id);
    if (!existing) {
      throw new AppError(404, "playlist_not_found");
    }

    await this.playlistRepository.update(id, playlist);
    this.eventBus.emit("playlists-updated");
  }

  async save(playlist: IPlaylist): Promise<IPlaylist> {
    const savedPlaylist = await this.playlistRepository.save(playlist);
    this.eventBus.emit("playlists-updated");
    return savedPlaylist.toPrimitive();
  }
}
