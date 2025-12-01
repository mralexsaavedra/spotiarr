import { TrackStatusEnum } from "@spotiarr/shared";
import { useMemo } from "react";
import { Playlist } from "../types/playlist";
import { Track } from "../types/track";

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

export const usePlaylistStats = (playlist: Playlist): PlaylistStats => {
  return useMemo(() => {
    const tracks = playlist.tracks || [];
    const completed = tracks.filter((t: Track) => t.status === TrackStatusEnum.Completed).length;

    const downloading = tracks.filter(
      (t: Track) => t.status === TrackStatusEnum.Downloading,
    ).length;
    const searching = tracks.filter((t: Track) => t.status === TrackStatusEnum.Searching).length;
    const queued = tracks.filter((t: Track) => t.status === TrackStatusEnum.Queued).length;

    // Aggregate for "is busy" logic
    const active = downloading + searching + queued;

    const errors = tracks.filter((t: Track) => t.status === TrackStatusEnum.Error).length;
    const total = tracks.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completedCount: completed,
      downloadingCount: downloading,
      searchingCount: searching,
      queuedCount: queued,
      activeCount: active,
      errorCount: errors,
      totalCount: total,
      progress: progressPercent,
      isDownloading: active > 0,
      hasErrors: errors > 0,
      isCompleted: completed === total && total > 0,
    };
  }, [playlist.tracks]);
};
