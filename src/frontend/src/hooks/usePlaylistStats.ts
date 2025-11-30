import { TrackStatusEnum } from "@spotiarr/shared";
import { useMemo } from "react";
import { Playlist } from "../types/playlist";
import { Track } from "../types/track";

export const usePlaylistStats = (playlist: Playlist) => {
  return useMemo(() => {
    const tracks = playlist.tracks || [];
    const completed = tracks.filter((t: Track) => t.status === TrackStatusEnum.Completed).length;
    const downloading = tracks.filter(
      (t: Track) =>
        t.status === TrackStatusEnum.Downloading ||
        t.status === TrackStatusEnum.Queued ||
        t.status === TrackStatusEnum.Searching,
    ).length;
    const errors = tracks.filter((t: Track) => t.status === TrackStatusEnum.Error).length;
    const total = tracks.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completedCount: completed,
      downloadingCount: downloading,
      errorCount: errors,
      totalCount: total,
      progress: progressPercent,
      isDownloading: downloading > 0,
      hasErrors: errors > 0,
      isCompleted: completed === total && total > 0,
    };
  }, [playlist.tracks]);
};
