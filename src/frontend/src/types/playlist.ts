import { IPlaylist } from "@spotiarr/shared";
import type { Track } from "./track";

export interface Playlist extends IPlaylist {
  id: string;
  collapsed?: boolean; // UI state
  tracks?: Track[];
}

export enum PlaylistStatusEnum {
  InProgress,
  Completed,
  Warning,
  Error,
  Subscribed,
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
