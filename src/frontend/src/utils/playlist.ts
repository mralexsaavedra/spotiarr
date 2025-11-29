import { TrackStatusEnum } from "@spotiarr/shared";
import { type Playlist, PlaylistStatusEnum } from "../types/playlist";
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

export const shouldClearPlaylist = (playlist: Playlist): boolean => {
  const status = getPlaylistStatus(playlist);

  if (playlist.subscribed) return false;
  if (status === PlaylistStatusEnum.Completed) return true;
  if (playlist.error) return true;

  const tracks = playlist.tracks ?? [];
  return tracks.some((track: Track) => track.status === TrackStatusEnum.Error);
};
