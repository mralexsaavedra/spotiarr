import { Injectable, Logger } from '@nestjs/common';
import { TrackEntity, TrackStatusEnum } from './track.entity';
import { PlaylistEntity } from '../playlist/playlist.entity';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { TrackGateway } from './track.gateway';
import { TrackRepository } from './track.repository';
import { TrackFileHelper } from '../shared/track-file.helper';
import { SearchTrackOnYoutubeUseCase } from './use-cases/search-track-on-youtube.use-case';
import { DownloadTrackUseCase } from './use-cases/download-track.use-case';

@Injectable()
export class TrackService {
  private readonly logger = new Logger(TrackService.name);

  constructor(
    private readonly repository: TrackRepository,
    @InjectQueue('track-download-processor') private trackDownloadQueue: Queue,
    @InjectQueue('track-search-processor') private trackSearchQueue: Queue,
    private readonly trackGateway: TrackGateway,
    private readonly trackFileHelper: TrackFileHelper,
    private readonly searchTrackOnYoutubeUseCase: SearchTrackOnYoutubeUseCase,
    private readonly downloadTrackUseCase: DownloadTrackUseCase,
  ) {}

  getAll(
    where?: { [key: string]: any },
    relations: Record<string, boolean> = {},
  ): Promise<TrackEntity[]> {
    return this.repository.findAll(where, relations);
  }

  getAllByPlaylist(id: number): Promise<TrackEntity[]> {
    return this.repository.findAllByPlaylist(id);
  }

  get(id: number): Promise<TrackEntity | null> {
    return this.repository.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
    this.trackGateway.emitDelete(id);
  }

  async create(track: TrackEntity, playlist?: PlaylistEntity): Promise<void> {
    const savedTrack = await this.repository.save({ ...track, playlist });
    await this.trackSearchQueue.add('', savedTrack, {
      jobId: `id-${savedTrack.id}`,
    });
    this.trackGateway.emitNew(savedTrack, playlist.id);
  }

  async update(id: number, track: TrackEntity): Promise<void> {
    await this.repository.update(id, track);
    this.trackGateway.emitUpdate(track);
  }

  async retry(id: number): Promise<void> {
    const track = await this.get(id);
    await this.trackSearchQueue.add('', track, { jobId: `id-${id}` });
    await this.update(id, { ...track, status: TrackStatusEnum.New });
  }

  async findOnYoutube(track: TrackEntity): Promise<void> {
    return this.searchTrackOnYoutubeUseCase.execute(track);
  }

  async downloadFromYoutube(track: TrackEntity): Promise<void> {
    return this.downloadTrackUseCase.execute(track);
  }

  getTrackFileName(track: TrackEntity): string {
    return this.trackFileHelper.getTrackFileName(track);
  }

  getFolderName(track: TrackEntity): string {
    return this.trackFileHelper.getFolderName(track);
  }
}
