import { TrackStatusEnum } from "@spotiarr/shared";
import { AppError } from "@/domain/errors/app-error";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { TrackService } from "../../services/track.service";

export class RetryPlaylistDownloadsUseCase {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly trackService: TrackService,
  ) {}

  async execute(id: string): Promise<void> {
    const playlist = await this.playlistRepository.findOne(id);
    if (!playlist) {
      throw new AppError(404, "playlist_not_found");
    }

    const tracks = await this.trackService.getAllByPlaylist(id);
    for (const track of tracks) {
      if (track.status === TrackStatusEnum.Error && track.id) {
        await this.trackService.retry(track.id);
      }
    }
  }
}
