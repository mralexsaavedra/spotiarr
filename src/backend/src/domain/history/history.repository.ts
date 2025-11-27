import type { DownloadHistoryEntity } from "../../entities/download-history.entity";
import type { TrackEntity } from "../../entities/track.entity";

// Domain-level repository interface for download history.
export interface HistoryRepository {
  findAll(limit?: number): Promise<DownloadHistoryEntity[]>;

  createFromTrack(track: TrackEntity): Promise<void>;
}
