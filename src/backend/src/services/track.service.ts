import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { EventBus } from "../domain/events/event-bus";
import { HistoryRepository } from "../domain/interfaces/history.repository";
import { PlaylistRepository } from "../domain/interfaces/playlist.repository";
import { TrackRepository } from "../domain/interfaces/track.repository";
import { DownloadTrackUseCase } from "../domain/tracks/download-track.use-case";
import { SearchTrackOnYoutubeUseCase } from "../domain/tracks/search-track-on-youtube.use-case";
import { TrackQueueService } from "../domain/tracks/track-queue.service";
import { TrackFileHelper } from "../helpers/track-file.helper";
import { AppError } from "../middleware/error-handler";
import { M3uService } from "./m3u.service";
import { SettingsService } from "./settings.service";
import { SpotifyService } from "./spotify.service";
import { UtilsService } from "./utils.service";
import { YoutubeService } from "./youtube.service";

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
  }

  getAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    return this.repository.findAll(where);
  }

  getAllByPlaylist(id: string): Promise<ITrack[]> {
    return this.repository.findAllByPlaylist(id);
  }

  get(id: string): Promise<ITrack | null> {
    return this.repository.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new AppError(404, "track_not_found");
    }

    await this.repository.delete(id);
  }

  async create(track: Partial<ITrack>): Promise<void> {
    const savedTrack = await this.repository.save(track as ITrack);
    await this.queueService.enqueueSearchTrack(savedTrack);
  }

  async update(id: string, track: Partial<ITrack>): Promise<void> {
    await this.repository.update(id, track);
  }

  async retry(id: string): Promise<void> {
    const track = await this.repository.findOneWithPlaylist(id);
    if (!track) {
      throw new AppError(404, "track_not_found");
    }
    await this.queueService.enqueueSearchTrack(track);
    await this.update(id, { status: TrackStatusEnum.New });
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
}
