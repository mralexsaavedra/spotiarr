import { TrackStatusEnum } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api } from "../services/api";
import { Playlist } from "../types/playlist";
import { useDownloadTracksQuery } from "./queries/useDownloadTracksQuery";
import { PLAYLISTS_QUERY_KEY } from "./queryKeys";

const selectTrackStatusMap = (data: Playlist[]) => {
  const map = new Map<string, TrackStatusEnum>();
  data.forEach((p) => {
    p.tracks?.forEach((t) => {
      if (t.trackUrl) map.set(t.trackUrl, t.status);
    });
  });
  return map;
};

export const useTrackStatus = () => {
  const { data: tracksStatusMap } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
    select: selectTrackStatusMap,
  });

  const { data: downloadTracks } = useDownloadTracksQuery();

  const downloadTracksSet = useMemo(() => {
    if (!downloadTracks) return new Set<string>();
    return new Set(downloadTracks.map((t) => t.trackUrl).filter(Boolean) as string[]);
  }, [downloadTracks]);

  const getTrackStatus = useCallback(
    (url: string): TrackStatusEnum | undefined => {
      if (tracksStatusMap?.has(url)) {
        return tracksStatusMap.get(url);
      }

      if (downloadTracksSet.has(url)) {
        return TrackStatusEnum.Completed;
      }

      return undefined;
    },
    [tracksStatusMap, downloadTracksSet],
  );

  return { getTrackStatus };
};
