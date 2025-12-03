import { TrackStatusEnum } from "@spotiarr/shared";
import { type Playlist, PlaylistStats } from "../types/playlist";
import type { Track } from "../types/track";

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

export const formatPlaylistTitle = (rawTitle: string, type: string, tracks: Track[]): string => {
  if (!rawTitle) return "Unnamed Playlist";

  const typeLower = type.toLowerCase();

  if (typeLower === "album") {
    if (tracks.length > 0 && tracks[0].album) {
      return tracks[0].album;
    }
    const parts = rawTitle.split(" - ");
    return parts.length > 1 ? parts.slice(1).join(" - ") : rawTitle;
  }

  if (typeLower === "track") {
    if (tracks.length > 0 && tracks[0].name) {
      return tracks[0].name;
    }
    const parts = rawTitle.split(" - ");
    return parts.length > 1 ? parts.slice(1).join(" - ") : rawTitle;
  }

  return rawTitle;
};
