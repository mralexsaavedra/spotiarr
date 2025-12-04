import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { EventBus } from "../../domain/events/event-bus";
import { HistoryRepository } from "../../domain/interfaces/history-repository.interface";
import { PlaylistRepository } from "../../domain/interfaces/playlist-repository.interface";
import { TrackQueueService } from "../../domain/interfaces/track-queue.interface";
import { TrackRepository } from "../../domain/interfaces/track-repository.interface";
import { SpotifyService } from "../../infrastructure/external/spotify.service";
import { YoutubeService } from "../../infrastructure/external/youtube.service";
import { M3uService } from "../../infrastructure/file-system/m3u.service";
import { TrackFileHelper } from "../../infrastructure/file-system/track-file.helper";
import { CreateTrackUseCase } from "../use-cases/tracks/create-track.use-case";
import { DeleteTrackUseCase } from "../use-cases/tracks/delete-track.use-case";
import { DownloadTrackUseCase } from "../use-cases/tracks/download-track.use-case";
import { GetTracksUseCase } from "../use-cases/tracks/get-tracks.use-case";
import { RetryTrackDownloadUseCase } from "../use-cases/tracks/retry-track-download.use-case";
import { SearchTrackOnYoutubeUseCase } from "../use-cases/tracks/search-track-on-youtube.use-case";
import { SettingsService } from "./settings.service";
import { UtilsService } from "./utils.service";

export interface TrackServiceDependencies {
  repository: TrackRepository;
  queueService: TrackQueueService;
  trackFileHelper: TrackFileHelper;
  youtubeService: YoutubeService;
  m3uService: M3uService;
  utilsService: UtilsService;
  settingsService: SettingsService;
  playlistRepository: PlaylistRepository;
  spotifyService: SpotifyService;
  historyRepository: HistoryRepository;
  eventBus: EventBus;
}

export class TrackService {
  private readonly repository: TrackRepository;
  private readonly queueService: TrackQueueService;
  private readonly trackFileHelper: TrackFileHelper;
  private readonly searchTrackOnYoutubeUseCase: SearchTrackOnYoutubeUseCase;
  private readonly downloadTrackUseCase: DownloadTrackUseCase;
  private readonly createTrackUseCase: CreateTrackUseCase;
  private readonly deleteTrackUseCase: DeleteTrackUseCase;
  private readonly getTracksUseCase: GetTracksUseCase;
  private readonly retryTrackDownloadUseCase: RetryTrackDownloadUseCase;

  constructor(deps: TrackServiceDependencies) {
    this.repository = deps.repository;
    this.queueService = deps.queueService;
    this.trackFileHelper = deps.trackFileHelper;

    this.searchTrackOnYoutubeUseCase = new SearchTrackOnYoutubeUseCase(
      this.repository,
      deps.youtubeService,
      deps.settingsService,
      this.queueService,
      deps.eventBus,
    );

    this.downloadTrackUseCase = new DownloadTrackUseCase(
      this.repository,
      deps.youtubeService,
      deps.m3uService,
      deps.utilsService,
      this.trackFileHelper,
      deps.playlistRepository,
      deps.spotifyService,
      deps.historyRepository,
      deps.eventBus,
    );

    this.createTrackUseCase = new CreateTrackUseCase(this.repository, this.queueService);
    this.deleteTrackUseCase = new DeleteTrackUseCase(this.repository);
    this.getTracksUseCase = new GetTracksUseCase(this.repository);
    this.retryTrackDownloadUseCase = new RetryTrackDownloadUseCase(
      this.repository,
      this.queueService,
    );
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
    await this.repository.update(id, track);
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

  getTrackFileName(track: ITrack): Promise<string> {
    return this.trackFileHelper.getTrackFileName(track);
  }

  getFolderName(track: ITrack): Promise<string> {
    return this.trackFileHelper.getFolderName(track);
  }

  async findStuckTracks(statuses: TrackStatusEnum[], createdBefore: number): Promise<ITrack[]> {
    return this.repository.findStuckTracks(statuses, createdBefore);
  }
}
