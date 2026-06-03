import { ApiRoutes, type ITrack, TrackStatusEnum } from "@spotiarr/shared";
import type { FileSystemTrackPathPort } from "@/application/ports/file-system.port";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import type { TrackRepository } from "@/domain/repositories/track.repository";

export class GetTracksUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly playlistRepository: PlaylistRepository,
    private readonly trackPathService: FileSystemTrackPathPort,
  ) {}

  async getAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    const tracks = await this.trackRepository.findAll(where);
    return tracks.map((t) => t.toPrimitive());
  }

  async getAllByPlaylist(id: string): Promise<ITrack[]> {
    const tracks = await this.trackRepository.findAllByPlaylist(id);
    const items = tracks.map((track) => track.toPrimitive());
    const hasPlayableTrack = items.some((track) => track.status === TrackStatusEnum.Completed);

    if (!hasPlayableTrack) {
      return items;
    }

    const playlist = await this.playlistRepository.findOne(id);
    const playlistName = playlist?.name;

    if (!playlistName) {
      return items;
    }

    return Promise.all(
      items.map(async (track) => {
        if (track.status !== TrackStatusEnum.Completed) {
          return track;
        }

        const filePath = await this.trackPathService.getTrackFileName(track, playlistName);

        return {
          ...track,
          audioUrl: `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/audio?path=${encodeURIComponent(filePath)}`,
        };
      }),
    );
  }

  async get(id: string): Promise<ITrack | null> {
    const track = await this.trackRepository.findOne(id);
    return track ? track.toPrimitive() : null;
  }

  async findStuckTracks(statuses: TrackStatusEnum[], createdBefore: number): Promise<ITrack[]> {
    const tracks = await this.trackRepository.findStuckTracks(statuses, createdBefore);
    return tracks.map((t) => t.toPrimitive());
  }
}
