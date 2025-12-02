import { TrackStatusEnum } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "../services/api";
import { Playlist } from "../types/playlist";
import { useDownloadTracksQuery } from "./queries/useDownloadTracksQuery";
import { PLAYLISTS_QUERY_KEY } from "./queryKeys";

export const useTrackStatus = () => {
  const { data: tracksStatusMap } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
    select: (data: Playlist[]) => {
      const map = new Map<string, TrackStatusEnum>();
      data.forEach((p) => {
        p.tracks?.forEach((t) => {
          if (t.trackUrl) map.set(t.trackUrl, t.status);
        });
      });
      return map;
    },
  });

  const { data: downloadTracks } = useDownloadTracksQuery();

  const getTrackStatus = useCallback(
    (url: string): TrackStatusEnum | undefined => {
      if (tracksStatusMap?.has(url)) {
        return tracksStatusMap.get(url);
      }

      const isHistory = downloadTracks?.some((t) => t.trackUrl === url);
      if (isHistory) return TrackStatusEnum.Completed;

      return undefined;
    },
    [tracksStatusMap, downloadTracks],
  );

  return { getTrackStatus };
};
