import type { ITrack } from "@spotiarr/shared";

export interface TrackQueueService {
  enqueueSearchTrack(track: ITrack): Promise<void>;
  enqueueDownloadTrack(track: ITrack, options?: { maxRetries?: number }): Promise<void>;
}
