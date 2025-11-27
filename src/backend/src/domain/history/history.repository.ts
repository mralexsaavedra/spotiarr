import type { DownloadHistoryItem, ITrack } from "@spotiarr/shared";

export interface HistoryRepository {
  findAll(limit?: number): Promise<DownloadHistoryItem[]>;

  createFromTrack(track: ITrack): Promise<void>;
}
