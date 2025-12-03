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

  // Calculate all status maps in a single pass for performance
  const { playlistStatusMap, trackStatusMap, albumTrackCountMap } = useMemo(() => {
    const pMap = new Map<string, PlaylistStatusEnum>();
    const tMap = new Map<string, TrackStatusEnum>();
    const aCountMap = new Map<string, number>();

    if (!playlists) {
      return {
        playlistStatusMap: pMap,
        trackStatusMap: tMap,
        albumTrackCountMap: aCountMap,
      };
    }

    playlists.forEach((p: Playlist) => {
      const status = calculatePlaylistStatus(p);

      // Add playlist URL
      if (p.spotifyUrl) {
        pMap.set(p.spotifyUrl, status);
      }

      // Process tracks
      if (p.tracks) {
        p.tracks.forEach((track) => {
          // Track status
          if (track.trackUrl) {
            tMap.set(track.trackUrl, track.status);
          }

          // Album status from tracks
          if (track.albumUrl) {
            // If track is completed, increment album count
            if (track.status === TrackStatusEnum.Completed) {
              aCountMap.set(track.albumUrl, (aCountMap.get(track.albumUrl) || 0) + 1);
            }
          }
        });
      }
    });

    return {
      playlistStatusMap: pMap,
      trackStatusMap: tMap,
      albumTrackCountMap: aCountMap,
    };
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
   * Can optionally check if all tracks of an album are downloaded based on expected count
   */
  const isPlaylistDownloaded = useCallback(
    (url: string | null | undefined, expectedTrackCount?: number): boolean => {
      if (!url) return false;

      // Check if the playlist/album itself is downloaded
      const status = getPlaylistStatus(url);
      if (status === PlaylistStatusEnum.Completed) return true;

      // Check if we have enough tracks downloaded
      if (expectedTrackCount && expectedTrackCount > 0) {
        const downloadedCount = albumTrackCountMap.get(url) || 0;
        if (downloadedCount >= expectedTrackCount) return true;
      }

      return false;
    },
    [getPlaylistStatus, albumTrackCountMap],
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
    (items: (string | null | undefined | { url?: string; totalTracks?: number })[]) => {
      const statusMap = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();

      items.forEach((item) => {
        let url: string | undefined;
        let totalTracks: number | undefined;

        if (typeof item === "string") {
          url = item;
        } else if (item && typeof item === "object") {
          url = item.url;
          totalTracks = item.totalTracks;
        }

        if (!url) return;

        const status = playlistStatusMap.get(url);
        let isDownloaded = status === PlaylistStatusEnum.Completed;

        // Check track count if not already marked as downloaded
        if (!isDownloaded && totalTracks && totalTracks > 0) {
          const downloadedCount = albumTrackCountMap.get(url) || 0;
          if (downloadedCount >= totalTracks) {
            isDownloaded = true;
          }
        }

        const isDownloading =
          status !== undefined &&
          status !== PlaylistStatusEnum.Completed &&
          status !== PlaylistStatusEnum.Error;

        statusMap.set(url, { isDownloaded, isDownloading });
      });

      return statusMap;
    },
    [playlistStatusMap, albumTrackCountMap],
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
