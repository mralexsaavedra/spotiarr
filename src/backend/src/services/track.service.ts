import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { DownloadTrackUseCase } from "../domain/tracks/download-track.use-case";
import { SearchTrackOnYoutubeUseCase } from "../domain/tracks/search-track-on-youtube.use-case";
import { TrackQueueService } from "../domain/tracks/track-queue.service";
import { TrackFileHelper } from "../helpers/track-file.helper";
import { AppError } from "../middleware/error-handler";
import { PrismaPlaylistRepository } from "../repositories/prisma-playlist.repository";
import { PrismaTrackRepository } from "../repositories/prisma-track.repository";
import { BullMqTrackQueueService } from "./bullmq-track-queue.service";
import { M3uService } from "./m3u.service";
import { SettingsService } from "./settings.service";
import { SpotifyApiService } from "./spotify-api.service";
import { SpotifyService } from "./spotify.service";
import { UtilsService } from "./utils.service";
import { YoutubeService } from "./youtube.service";

export class TrackService {
  private readonly repository: PrismaTrackRepository;
  private readonly queueService: TrackQueueService;
  private readonly trackFileHelper: TrackFileHelper;
  private readonly searchTrackOnYoutubeUseCase: SearchTrackOnYoutubeUseCase;
  private readonly downloadTrackUseCase: DownloadTrackUseCase;

  constructor() {
    this.repository = new PrismaTrackRepository();
    this.queueService = new BullMqTrackQueueService();
    this.trackFileHelper = new TrackFileHelper();

    const youtubeService = new YoutubeService();
    const m3uService = new M3uService();
    const utilsService = new UtilsService();
    const settingsService = new SettingsService();
    const playlistRepository = new PrismaPlaylistRepository();
    const spotifyApiService = SpotifyApiService.getInstance();
    const spotifyService = new SpotifyService(spotifyApiService);

    this.searchTrackOnYoutubeUseCase = new SearchTrackOnYoutubeUseCase(
      this.repository,
      youtubeService,
      settingsService,
      this.queueService,
    );

    this.downloadTrackUseCase = new DownloadTrackUseCase(
      this.repository,
      youtubeService,
      m3uService,
      utilsService,
      this.trackFileHelper,
      playlistRepository,
      spotifyService,
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
