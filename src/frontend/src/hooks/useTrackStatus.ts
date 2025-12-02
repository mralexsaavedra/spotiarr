import { TrackStatusEnum } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "../services/api";
import { Playlist } from "../types/playlist";
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

  const getTrackStatus = useCallback(
    (url: string): TrackStatusEnum | undefined => {
      return tracksStatusMap?.get(url);
    },
    [tracksStatusMap],
  );

  return { getTrackStatus };
};
