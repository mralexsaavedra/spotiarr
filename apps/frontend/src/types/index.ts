import { IPlaylist, ITrack, TrackStatusEnum } from "@spotiarr/shared";

export interface Track extends ITrack {
  id: string;
  playlistId?: string;
  status: TrackStatusEnum; // Override optional status with required
}

export interface Playlist extends IPlaylist {
  id: string;
  tracks?: Track[];
}

export interface PlaylistStats {
  completedCount: number;
  downloadingCount: number;
  searchingCount: number;
  queuedCount: number;
  activeCount: number;
  errorCount: number;
  totalCount: number;
  progress: number;
  isDownloading: boolean;
  hasErrors: boolean;
  isCompleted: boolean;
}

export interface PlaylistWithStats extends Playlist {
  stats: PlaylistStats;
}
