import type { ITrack } from "@spotiarr/shared";
import type { TrackQueueService } from "@/domain/services/track-queue.service";
import { getTrackDownloadQueue, getTrackSearchQueue } from "../setup/queues";

export class BullMqTrackQueueService implements TrackQueueService {
  async enqueueSearchTrack(track: ITrack): Promise<void> {
    await getTrackSearchQueue().add("search-track", track, {
      jobId: `id-${track.id}`,
    });
  }

  async enqueueDownloadTrack(track: ITrack, options?: { maxRetries?: number }): Promise<void> {
    const attempts = options?.maxRetries ?? 3;
    const jobId = `download-${track.id}`;

    await getTrackDownloadQueue().add("download-track", track, {
      jobId,
      attempts,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      // Remove failed jobs too: with a deterministic jobId, a lingering
      // failed job would block any re-enqueue (queue.add with the same id
      // is a no-op), permanently stranding retries. The failed handler
      // still fires before removal.
      removeOnFail: true,
    });
  }
}
