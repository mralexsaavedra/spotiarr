import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { CreateTrackUseCase } from "../use-cases/tracks/create-track.use-case";
import { DeleteTrackUseCase } from "../use-cases/tracks/delete-track.use-case";
import { DownloadTrackUseCase } from "../use-cases/tracks/download-track.use-case";
import { GetTracksUseCase } from "../use-cases/tracks/get-tracks.use-case";
import { RetryTrackDownloadUseCase } from "../use-cases/tracks/retry-track-download.use-case";
import { SearchTrackOnYoutubeUseCase } from "../use-cases/tracks/search-track-on-youtube.use-case";
import { UpdateTrackUseCase } from "../use-cases/tracks/update-track.use-case";

export interface TrackServiceDependencies {
  // Use Cases
  searchTrackOnYoutubeUseCase: SearchTrackOnYoutubeUseCase;
  downloadTrackUseCase: DownloadTrackUseCase;
  createTrackUseCase: CreateTrackUseCase;
  deleteTrackUseCase: DeleteTrackUseCase;
  getTracksUseCase: GetTracksUseCase;
  retryTrackDownloadUseCase: RetryTrackDownloadUseCase;
  updateTrackUseCase: UpdateTrackUseCase;
}

export class TrackService {
  private readonly searchTrackOnYoutubeUseCase: SearchTrackOnYoutubeUseCase;
  private readonly downloadTrackUseCase: DownloadTrackUseCase;
  private readonly createTrackUseCase: CreateTrackUseCase;
  private readonly deleteTrackUseCase: DeleteTrackUseCase;
  private readonly getTracksUseCase: GetTracksUseCase;
  private readonly retryTrackDownloadUseCase: RetryTrackDownloadUseCase;
  private readonly updateTrackUseCase: UpdateTrackUseCase;

  constructor(deps: TrackServiceDependencies) {
    this.searchTrackOnYoutubeUseCase = deps.searchTrackOnYoutubeUseCase;
    this.downloadTrackUseCase = deps.downloadTrackUseCase;
    this.createTrackUseCase = deps.createTrackUseCase;
    this.deleteTrackUseCase = deps.deleteTrackUseCase;
    this.getTracksUseCase = deps.getTracksUseCase;
    this.retryTrackDownloadUseCase = deps.retryTrackDownloadUseCase;
    this.updateTrackUseCase = deps.updateTrackUseCase;
  }

  getAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    return this.getTracksUseCase.getAll(where);
  }

  getAllByPlaylist(id: string): Promise<ITrack[]> {
    return this.getTracksUseCase.getAllByPlaylist(id);
  }

  get(id: string): Promise<ITrack | null> {
    return this.getTracksUseCase.get(id);
  }

  async remove(id: string): Promise<void> {
    return this.deleteTrackUseCase.execute(id);
  }

  async create(track: Partial<ITrack>): Promise<void> {
    return this.createTrackUseCase.execute(track);
  }

  async update(id: string, track: Partial<ITrack>): Promise<void> {
    await this.updateTrackUseCase.execute(id, track);
  }

  async retry(id: string): Promise<void> {
    return this.retryTrackDownloadUseCase.execute(id);
  }

  async findOnYoutube(track: ITrack): Promise<void> {
    return this.searchTrackOnYoutubeUseCase.execute(track);
  }

  async downloadFromYoutube(track: ITrack): Promise<void> {
    return this.downloadTrackUseCase.execute(track);
  }

  async findStuckTracks(statuses: TrackStatusEnum[], createdBefore: number): Promise<ITrack[]> {
    return this.getTracksUseCase.findStuckTracks(statuses, createdBefore);
  }
}
