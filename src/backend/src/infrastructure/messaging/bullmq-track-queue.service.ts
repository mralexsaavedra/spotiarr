import type { ITrack } from "@spotiarr/shared";
import type { TrackQueueService } from "../../domain/interfaces/track-queue.interface";
import { getTrackDownloadQueue, getTrackSearchQueue } from "../setup/queues";

export class BullMqTrackQueueService implements TrackQueueService {
  async enqueueSearchTrack(track: ITrack): Promise<void> {
    await getTrackSearchQueue().add("search-track", track, {
      jobId: `id-${track.id}`,
    });
  }

  async enqueueDownloadTrack(track: ITrack, options?: { maxRetries?: number }): Promise<void> {
    const attempts = options?.maxRetries ?? 3;
    const jobId = `download-${track.id}-${Date.now()}`;

    await getTrackDownloadQueue().add("download-track", track, {
      jobId,
      attempts,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
