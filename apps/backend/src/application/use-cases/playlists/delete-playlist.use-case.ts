import { AppError } from "@/domain/errors/app-error";
import { EventBus } from "@/domain/events/event-bus";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";

export class DeletePlaylistUseCase {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.playlistRepository.findOne(id);
    if (!existing) {
      throw new AppError(404, "playlist_not_found");
    }

    await this.playlistRepository.delete(id);
    this.eventBus.emit("playlists-updated");
  }
}
