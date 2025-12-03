import { TrackStatusEnum } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api } from "../services/api";
import { Playlist, PlaylistStatusEnum } from "../types/playlist";
import { getPlaylistStatus as calculatePlaylistStatus } from "../utils/playlist";
import { PLAYLISTS_QUERY_KEY } from "./queryKeys";

/**
 * Unified hook for checking download status of playlists, albums, and tracks.
 * Only checks active playlists (not download history).
 */
export const useDownloadStatus = () => {
  const { data: playlists } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
  });

  // Map of playlist/album URLs to their status
  const playlistStatusMap = useMemo(() => {
    const map = new Map<string, PlaylistStatusEnum>();
    if (!playlists) return map;

    playlists.forEach((p: Playlist) => {
      const status = calculatePlaylistStatus(p);

      // Add playlist URL
      if (p.spotifyUrl) {
        map.set(p.spotifyUrl, status);
      }

      // Also add album URLs from tracks (for when individual tracks are downloaded)
      if (p.tracks) {
        p.tracks.forEach((track) => {
          if (track.albumUrl && !map.has(track.albumUrl)) {
            map.set(track.albumUrl, status);
          }
        });
      }
    });

    return map;
  }, [playlists]);

  // Map of track URLs to their status
  const trackStatusMap = useMemo(() => {
    const map = new Map<string, TrackStatusEnum>();
    if (!playlists) return map;

    playlists.forEach((p) => {
      p.tracks?.forEach((t) => {
        if (t.trackUrl) map.set(t.trackUrl, t.status);
      });
    });

    return map;
  }, [playlists]);

  /**
   * Get the status of a playlist or album by its Spotify URL
   */
  const getPlaylistStatus = useCallback(
    (url: string | null | undefined): PlaylistStatusEnum | undefined => {
      if (!url) return undefined;
      return playlistStatusMap.get(url);
    },
    [playlistStatusMap],
  );

  /**
   * Check if a playlist or album is downloaded (completed)
   */
  const isPlaylistDownloaded = useCallback(
    (url: string | null | undefined): boolean => {
      const status = getPlaylistStatus(url);
      return status === PlaylistStatusEnum.Completed;
    },
    [getPlaylistStatus],
  );

  /**
   * Check if a playlist or album is currently downloading
   */
  const isPlaylistDownloading = useCallback(
    (url: string | null | undefined): boolean => {
      const status = getPlaylistStatus(url);
      return (
        status !== undefined &&
        status !== PlaylistStatusEnum.Completed &&
        status !== PlaylistStatusEnum.Error
      );
    },
    [getPlaylistStatus],
  );

  /**
   * Get the status of a track by its Spotify URL
   */
  const getTrackStatus = useCallback(
    (url: string | null | undefined): TrackStatusEnum | undefined => {
      if (!url) return undefined;
      return trackStatusMap.get(url);
    },
    [trackStatusMap],
  );

  /**
   * Optimized helper for lists: Get download states for multiple URLs at once
   * Returns a Map of URL -> { isDownloaded, isDownloading }
   * This avoids repeated function calls in list renders
   */
  const getBulkPlaylistStatus = useCallback(
    (urls: (string | null | undefined)[]) => {
      const statusMap = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();

      urls.forEach((url) => {
        if (!url) return;

        const status = playlistStatusMap.get(url);
        const isDownloaded = status === PlaylistStatusEnum.Completed;
        const isDownloading =
          status !== undefined &&
          status !== PlaylistStatusEnum.Completed &&
          status !== PlaylistStatusEnum.Error;

        statusMap.set(url, { isDownloaded, isDownloading });
      });

      return statusMap;
    },
    [playlistStatusMap],
  );

  /**
   * Optimized helper for track lists: Get track statuses for multiple URLs at once
   */
  const getBulkTrackStatus = useCallback(
    (urls: (string | null | undefined)[]) => {
      const statusMap = new Map<string, TrackStatusEnum>();

      urls.forEach((url) => {
        if (!url) return;
        const status = trackStatusMap.get(url);
        if (status) {
          statusMap.set(url, status);
        }
      });

      return statusMap;
    },
    [trackStatusMap],
  );

  return {
    // Maps (direct access for advanced use cases)
    playlistStatusMap,
    trackStatusMap,

    // Single item helpers
    getPlaylistStatus,
    isPlaylistDownloaded,
    isPlaylistDownloading,
    getTrackStatus,

    // Bulk helpers (optimized for lists)
    getBulkPlaylistStatus,
    getBulkTrackStatus,
  };
};
