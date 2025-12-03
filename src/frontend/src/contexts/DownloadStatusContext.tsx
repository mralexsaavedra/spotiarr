import { PlaylistStatusEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { createContext, FC, ReactNode, useCallback, useContext, useMemo } from "react";
import { DOWNLOAD_STATUS_QUERY_KEY } from "../hooks/queryKeys";
import { api } from "../services/api";

interface DownloadStatusContextValue {
  playlistStatusMap: Map<string, PlaylistStatusEnum>;
  trackStatusMap: Map<string, TrackStatusEnum>;
  getPlaylistStatus: (url: string | null | undefined) => PlaylistStatusEnum | undefined;
  isPlaylistDownloaded: (url: string | null | undefined, expectedTrackCount?: number) => boolean;
  isPlaylistDownloading: (url: string | null | undefined) => boolean;
  getTrackStatus: (url: string | null | undefined) => TrackStatusEnum | undefined;
  getBulkPlaylistStatus: (
    items: (string | null | undefined | { url?: string; totalTracks?: number })[],
  ) => Map<string, { isDownloaded: boolean; isDownloading: boolean }>;
  getBulkTrackStatus: (urls: (string | null | undefined)[]) => Map<string, TrackStatusEnum>;
}

const DownloadStatusContext = createContext<DownloadStatusContextValue | null>(null);

export const DownloadStatusProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { data } = useQuery({
    queryKey: DOWNLOAD_STATUS_QUERY_KEY,
    queryFn: () => api.getDownloadStatus(),
    refetchInterval: 5000, // Poll every 5 seconds to keep status fresh
  });

  // Convert API response (Records) to Maps
  const { playlistStatusMap, trackStatusMap, albumTrackCountMap } = useMemo(() => {
    if (!data) {
      return {
        playlistStatusMap: new Map<string, PlaylistStatusEnum>(),
        trackStatusMap: new Map<string, TrackStatusEnum>(),
        albumTrackCountMap: new Map<string, number>(),
      };
    }

    return {
      playlistStatusMap: new Map(Object.entries(data.playlistStatusMap)) as Map<
        string,
        PlaylistStatusEnum
      >,
      trackStatusMap: new Map(Object.entries(data.trackStatusMap)) as Map<string, TrackStatusEnum>,
      albumTrackCountMap: new Map(Object.entries(data.albumTrackCountMap)) as Map<string, number>,
    };
  }, [data]);

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

        if (!url) {
          return;
        }

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
        if (!url) {
          return;
        }

        const status = trackStatusMap.get(url);
        if (status) {
          statusMap.set(url, status);
        }
      });

      return statusMap;
    },
    [trackStatusMap],
  );

  const value = useMemo(
    () => ({
      playlistStatusMap,
      trackStatusMap,
      getPlaylistStatus,
      isPlaylistDownloaded,
      isPlaylistDownloading,
      getTrackStatus,
      getBulkPlaylistStatus,
      getBulkTrackStatus,
    }),
    [
      playlistStatusMap,
      trackStatusMap,
      getPlaylistStatus,
      isPlaylistDownloaded,
      isPlaylistDownloading,
      getTrackStatus,
      getBulkPlaylistStatus,
      getBulkTrackStatus,
    ],
  );

  return <DownloadStatusContext.Provider value={value}>{children}</DownloadStatusContext.Provider>;
};

export const useDownloadStatusContext = () => {
  const context = useContext(DownloadStatusContext);
  if (!context) {
    throw new Error("useDownloadStatusContext must be used within a DownloadStatusProvider");
  }
  return context;
};
