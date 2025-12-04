import { PlaylistStatusEnum, TrackStatusEnum, type DownloadStatusResponse } from "@spotiarr/shared";
import type { PlaylistRepository } from "../../../domain/repositories/playlist.repository";

export class GetSystemStatusUseCase {
  constructor(private readonly playlistRepository: PlaylistRepository) {}

  async execute(): Promise<DownloadStatusResponse> {
    const playlists = await this.playlistRepository.findAll(true);
    const playlistStatusMap: Record<string, PlaylistStatusEnum> = {};
    const trackStatusMap: Record<string, TrackStatusEnum> = {};
    const albumTrackCountMap: Record<string, number> = {};

    for (const playlist of playlists) {
      const status = playlist.calculateStatus();

      if (playlist.spotifyUrl) {
        playlistStatusMap[playlist.spotifyUrl] = status;
      }

      if (playlist.tracks) {
        for (const track of playlist.tracks) {
          if (track.trackUrl && track.status) {
            trackStatusMap[track.trackUrl] = track.status;
          }

          if (track.albumUrl && track.status === TrackStatusEnum.Completed) {
            albumTrackCountMap[track.albumUrl] = (albumTrackCountMap[track.albumUrl] || 0) + 1;
          }
        }
      }
    }

    return {
      playlistStatusMap,
      trackStatusMap,
      albumTrackCountMap,
    };
  }
}
