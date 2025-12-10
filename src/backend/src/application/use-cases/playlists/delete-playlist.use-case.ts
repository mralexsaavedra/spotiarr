import { TrackStatusEnum } from "@spotiarr/shared";
import { EventBus } from "@/domain/events/event-bus";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { AppError } from "@/presentation/middleware/error-handler";

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

  async removeCompleted(): Promise<void> {
    const playlists = await this.playlistRepository.findAll(true);
    const completedPlaylists = playlists.filter((playlist) => {
      const p = playlist.toPrimitive();
      if (!p.tracks || p.tracks.length === 0) return false;
      return p.tracks.every((track) => track.status === TrackStatusEnum.Completed);
    });

    for (const playlist of completedPlaylists) {
      await this.playlistRepository.delete(playlist.id);
    }

    if (completedPlaylists.length > 0) {
      this.eventBus.emit("playlists-updated");
    }
  }
}
