import { Injectable, Logger } from '@nestjs/common';
import { TrackEntity, TrackStatusEnum } from '../track.entity';
import { YoutubeService } from '../../shared/youtube.service';
import { TrackRepository } from '../track.repository';
import { TrackGateway } from '../track.gateway';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Injectable()
export class SearchTrackOnYoutubeUseCase {
  private readonly logger = new Logger(SearchTrackOnYoutubeUseCase.name);

  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeService: YoutubeService,
    private readonly trackGateway: TrackGateway,
    @InjectQueue('track-download-processor') private trackDownloadQueue: Queue,
  ) {}

  async execute(track: TrackEntity): Promise<void> {
    // Check if track still exists
    if (!(await this.trackRepository.findOne(track.id))) {
      return;
    }

    // Update status to Searching
    await this.trackRepository.update(track.id, {
      ...track,
      status: TrackStatusEnum.Searching,
    });
    this.trackGateway.emitUpdate({
      ...track,
      status: TrackStatusEnum.Searching,
    });

    let updatedTrack: TrackEntity;

    try {
      const youtubeUrl = await this.youtubeService.findOnYoutubeOne(
        track.artist,
        track.name,
      );
      updatedTrack = { ...track, youtubeUrl, status: TrackStatusEnum.Queued };
    } catch (error) {
      this.logger.error(
        `Failed to find track on YouTube: ${track.artist} - ${track.name}`,
        error instanceof Error ? error.stack : String(error),
      );
      updatedTrack = {
        ...track,
        error: error instanceof Error ? error.message : String(error),
        status: TrackStatusEnum.Error,
      };
    }

    // Queue for download
    await this.trackDownloadQueue.add('', updatedTrack, {
      jobId: `id-${updatedTrack.id}`,
    });

    // Update track status
    await this.trackRepository.update(track.id, updatedTrack);
    this.trackGateway.emitUpdate(updatedTrack);
  }
}
