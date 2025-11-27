import { type ITrack } from "@spotiarr/shared";
import { DownloadTrackUseCase } from "domain/tracks/download-track.use-case";
import { SearchTrackOnYoutubeUseCase } from "domain/tracks/search-track-on-youtube.use-case";
import { TrackUseCases } from "../domain/tracks/track.use-cases";
import { TrackFileHelper } from "../helpers/track-file.helper";
import { PrismaTrackRepository } from "../repositories/prisma-track.repository";
import { M3uService } from "./m3u.service";
import { SettingsService } from "./settings.service";
import { UtilsService } from "./utils.service";
import { YoutubeService } from "./youtube.service";

export class TrackService {
  private readonly repository: PrismaTrackRepository;
  private readonly useCases: TrackUseCases;
  private readonly trackFileHelper: TrackFileHelper;
  private readonly searchTrackOnYoutubeUseCase: SearchTrackOnYoutubeUseCase;
  private readonly downloadTrackUseCase: DownloadTrackUseCase;

  constructor() {
    this.repository = new PrismaTrackRepository();
    this.useCases = new TrackUseCases({ repository: this.repository });
    this.trackFileHelper = new TrackFileHelper();

    const youtubeService = new YoutubeService();
    const m3uService = new M3uService();
    const utilsService = new UtilsService();
    const settingsService = new SettingsService();

    this.searchTrackOnYoutubeUseCase = new SearchTrackOnYoutubeUseCase(
      this.repository,
      youtubeService,
      settingsService,
    );

    this.downloadTrackUseCase = new DownloadTrackUseCase(
      this.repository,
      youtubeService,
      m3uService,
      utilsService,
      this.trackFileHelper,
    );
  }

  getAll(where?: Partial<ITrack>): Promise<ITrack[]> {
    return this.useCases.getAll(where);
  }

  getAllByPlaylist(id: string): Promise<ITrack[]> {
    return this.useCases.getAllByPlaylist(id);
  }

  get(id: string): Promise<ITrack | null> {
    return this.useCases.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.useCases.remove(id);
  }

  async create(track: Partial<ITrack>): Promise<void> {
    await this.useCases.create(track);
  }

  async update(id: string, track: Partial<ITrack>): Promise<void> {
    await this.useCases.update(id, track);
  }

  async retry(id: string): Promise<void> {
    await this.useCases.retry(id);
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
