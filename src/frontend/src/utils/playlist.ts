import { TrackStatusEnum } from "@spotiarr/shared";
import { type Playlist, PlaylistStatusEnum, PlaylistStats } from "../types/playlist";
import type { Track } from "../types/track";

export interface PlaylistMetrics {
  totalCount: number;
  completedCount: number;
  failedCount: number;
  hasTracks: boolean;
  hasFailed: boolean;
}

export const getPlaylistMetrics = (tracks: Track[]): PlaylistMetrics => {
  const totalCount = tracks.length;
  const completedCount = tracks.filter((t) => t.status === TrackStatusEnum.Completed).length;
  const failedCount = tracks.filter((t) => t.status === TrackStatusEnum.Error).length;

  return {
    totalCount,
    completedCount,
    failedCount,
    hasTracks: totalCount > 0,
    hasFailed: failedCount > 0,
  };
};

export const getPlaylistStatus = (playlist: Playlist): PlaylistStatusEnum => {
  if (playlist.error) return PlaylistStatusEnum.Error;

  const tracks = playlist.tracks ?? [];
  const { hasTracks, completedCount, failedCount } = getPlaylistMetrics(tracks);

  if (hasTracks && completedCount === tracks.length) {
    return PlaylistStatusEnum.Completed;
  }

  if (failedCount > 0) {
    return PlaylistStatusEnum.Warning;
  }

  if (playlist.subscribed) return PlaylistStatusEnum.Subscribed;

  return PlaylistStatusEnum.InProgress;
};

export const calculatePlaylistStats = (playlist: Playlist): PlaylistStats => {
  const tracks = playlist.tracks || [];
  const completed = tracks.filter((t: Track) => t.status === TrackStatusEnum.Completed).length;

  const downloading = tracks.filter((t: Track) => t.status === TrackStatusEnum.Downloading).length;
  const searching = tracks.filter((t: Track) => t.status === TrackStatusEnum.Searching).length;
  const queued = tracks.filter((t: Track) => t.status === TrackStatusEnum.Queued).length;

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
};
