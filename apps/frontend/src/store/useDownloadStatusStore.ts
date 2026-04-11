import { PlaylistStatusEnum, TrackStatusEnum } from "@spotiarr/shared";
import type { DownloadStatusResponse } from "@spotiarr/shared";
import { useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

interface DownloadStatusState {
  playlistStatusMap: Map<string, PlaylistStatusEnum>;
  trackStatusMap: Map<string, TrackStatusEnum>;
  albumTrackCountMap: Map<string, number>;
  syncFromResponse: (data?: DownloadStatusResponse) => void;
}

export const useDownloadStatusStore = create<DownloadStatusState>((set) => ({
  playlistStatusMap: new Map(),
  trackStatusMap: new Map(),
  albumTrackCountMap: new Map(),
  syncFromResponse: (data?: DownloadStatusResponse) => {
    if (!data) return;

    const playlistStatusMap = new Map(Object.entries(data.playlistStatusMap)) as Map<
      string,
      PlaylistStatusEnum
    >;
    const trackStatusMap = new Map(Object.entries(data.trackStatusMap)) as Map<
      string,
      TrackStatusEnum
    >;
    const albumTrackCountMap = new Map(Object.entries(data.albumTrackCountMap)) as Map<
      string,
      number
    >;

    set({ playlistStatusMap, trackStatusMap, albumTrackCountMap });
  },
}));

/**
 * Derive isDownloaded state from store state
 */
function deriveIsDownloaded(
  state: DownloadStatusState,
  url: string,
  expectedTrackCount?: number,
): boolean {
  const status = state.playlistStatusMap.get(url);
  if (status === PlaylistStatusEnum.Completed) return true;

  if (expectedTrackCount != null && expectedTrackCount > 0) {
    const albumCount = state.albumTrackCountMap.get(url) ?? 0;
    if (albumCount >= expectedTrackCount) return true;
  }

  return false;
}

/**
 * Derive isDownloading state from store state
 */
function deriveIsDownloading(state: DownloadStatusState, url: string): boolean {
  const status = state.playlistStatusMap.get(url);
  return (
    status !== undefined &&
    status !== PlaylistStatusEnum.Completed &&
    status !== PlaylistStatusEnum.Error
  );
}

/**
 * Check if a playlist or album is downloaded (completed)
 * Can optionally check if all tracks of an album are downloaded based on expected count
 */
export function usePlaylistDownloaded(
  url: string | null | undefined,
  expectedTrackCount?: number,
): boolean {
  return useDownloadStatusStore((state) => {
    if (!url) return false;
    return deriveIsDownloaded(state, url, expectedTrackCount);
  });
}

/**
 * Check if a playlist or album is currently downloading
 */
export function usePlaylistDownloading(url: string | null | undefined): boolean {
  return useDownloadStatusStore((state) => {
    if (!url) return false;
    return deriveIsDownloading(state, url);
  });
}

/**
 * Get the status of a track by its Spotify URL
 */
export function useTrackStatus(url: string | null | undefined): TrackStatusEnum | undefined {
  return useDownloadStatusStore((state) => {
    if (!url) return undefined;
    return state.trackStatusMap.get(url);
  });
}

/**
 * Get a snapshot of all download status maps
 */
export function useDownloadStatusSnapshot(): {
  playlistStatusMap: Map<string, PlaylistStatusEnum>;
  trackStatusMap: Map<string, TrackStatusEnum>;
  albumTrackCountMap: Map<string, number>;
} {
  return useDownloadStatusStore((state) => ({
    playlistStatusMap: state.playlistStatusMap,
    trackStatusMap: state.trackStatusMap,
    albumTrackCountMap: state.albumTrackCountMap,
  }));
}

/**
 * Optimized hook for lists: Get download states for multiple URLs at once
 * Returns a Map of URL -> { isDownloaded, isDownloading }
 * Uses shallow equality to avoid re-renders on unrelated changes
 */
export function useBulkPlaylistStatus(
  items: (string | null | undefined | { url?: string | null; totalTracks?: number })[],
): Map<string, { isDownloaded: boolean; isDownloading: boolean }> {
  const selected = useDownloadStatusStore(
    useShallow((state) =>
      items.flatMap((item) => {
        const url = typeof item === "string" ? item : item?.url;
        const totalTracks = typeof item === "string" ? undefined : item?.totalTracks;

        if (!url) return [];

        return [url, deriveIsDownloaded(state, url, totalTracks), deriveIsDownloading(state, url)];
      }),
    ),
  );

  return useMemo(() => {
    const result = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();

    for (let index = 0; index < selected.length; index += 3) {
      const url = selected[index] as string;
      const isDownloaded = selected[index + 1] as boolean;
      const isDownloading = selected[index + 2] as boolean;

      result.set(url, { isDownloaded, isDownloading });
    }

    return result;
  }, [selected]);
}

/**
 * Optimized hook for track lists: Get track statuses for multiple URLs at once
 * Uses shallow equality to avoid re-renders on unrelated changes
 */
export function useBulkTrackStatus(
  urls: (string | null | undefined)[],
): Map<string, TrackStatusEnum> {
  const selected = useDownloadStatusStore(
    useShallow((state) =>
      urls.flatMap((url) => {
        if (!url) return [];
        const status = state.trackStatusMap.get(url);
        return status ? [url, status] : [url, undefined];
      }),
    ),
  );

  return useMemo(() => {
    const result = new Map<string, TrackStatusEnum>();

    for (let index = 0; index < selected.length; index += 2) {
      const url = selected[index] as string;
      const status = selected[index + 1] as TrackStatusEnum | undefined;

      if (status) {
        result.set(url, status);
      }
    }

    return result;
  }, [selected]);
}
