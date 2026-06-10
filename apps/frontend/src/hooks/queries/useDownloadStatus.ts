import { PlaylistStatusEnum, type TrackStatusEnum } from "@spotiarr/shared";
import type { DownloadStatusResponse } from "@spotiarr/shared";
import { useMemo } from "react";
import { useDownloadStatusQuery } from "./useDownloadStatusQuery";

export function deriveIsDownloaded(
  data: DownloadStatusResponse | undefined,
  url: string,
  expectedTrackCount?: number,
): boolean {
  if (!data) return false;
  const status = data.playlistStatusMap[url];
  if (status === PlaylistStatusEnum.Completed) return true;
  if (expectedTrackCount != null && expectedTrackCount > 0) {
    const albumCount = data.albumTrackCountMap[url] ?? 0;
    if (albumCount >= expectedTrackCount) return true;
  }
  return false;
}

export function deriveIsDownloading(
  data: DownloadStatusResponse | undefined,
  url: string,
): boolean {
  if (!data) return false;
  const status = data.playlistStatusMap[url];
  return (
    status !== undefined &&
    status !== PlaylistStatusEnum.Completed &&
    status !== PlaylistStatusEnum.Error
  );
}

export function usePlaylistDownloaded(
  url: string | null | undefined,
  expectedTrackCount?: number,
): boolean {
  const { data } = useDownloadStatusQuery();
  return useMemo(() => {
    if (!url) return false;
    return deriveIsDownloaded(data, url, expectedTrackCount);
  }, [data, url, expectedTrackCount]);
}

export function usePlaylistDownloading(url: string | null | undefined): boolean {
  const { data } = useDownloadStatusQuery();
  return useMemo(() => {
    if (!url) return false;
    return deriveIsDownloading(data, url);
  }, [data, url]);
}

export function useBulkPlaylistStatus(
  items: (string | null | undefined | { url?: string | null; totalTracks?: number })[],
): Map<string, { isDownloaded: boolean; isDownloading: boolean }> {
  const { data } = useDownloadStatusQuery();
  return useMemo(() => {
    const result = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();
    for (const item of items) {
      const url = typeof item === "string" ? item : item?.url;
      const totalTracks = typeof item === "string" ? undefined : item?.totalTracks;
      if (!url) continue;
      result.set(url, {
        isDownloaded: deriveIsDownloaded(data, url, totalTracks),
        isDownloading: deriveIsDownloading(data, url),
      });
    }
    return result;
  }, [data, items]);
}

export function useBulkTrackStatus(
  urls: (string | null | undefined)[],
): Map<string, TrackStatusEnum> {
  const { data } = useDownloadStatusQuery();
  return useMemo(() => {
    const result = new Map<string, TrackStatusEnum>();
    if (!data) return result;
    for (const url of urls) {
      if (!url) continue;
      const status = data.trackStatusMap[url];
      if (status !== undefined) {
        result.set(url, status);
      }
    }
    return result;
  }, [data, urls]);
}
