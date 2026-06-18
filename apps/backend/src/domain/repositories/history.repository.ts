import type { DownloadHistoryItem, ITrack, RecordPlayInput } from "@spotiarr/shared";

export interface HistoryRepository {
  findAll(limit?: number): Promise<DownloadHistoryItem[]>;

  createFromTrack(track: ITrack): Promise<void>;

  recordPlay(input: RecordPlayInput): Promise<void>;
}
