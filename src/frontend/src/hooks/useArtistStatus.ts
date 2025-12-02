import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "../services/api";
import { Playlist } from "../types/playlist";
import { useDownloadTracksQuery } from "./queries/useDownloadTracksQuery";
import { PLAYLISTS_QUERY_KEY } from "./queryKeys";

export const useArtistStatus = () => {
  const { data: activeArtistsSet } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
    select: (data: Playlist[]) => {
      const set = new Set<string>();
      data.forEach((p) => {
        if (p.spotifyUrl) set.add(p.spotifyUrl);
      });
      return set;
    },
  });

  const { data: downloadTracks } = useDownloadTracksQuery();

  const getArtistStatus = useCallback(
    (artistUrl: string | undefined | null): boolean => {
      if (!artistUrl) return false;

      if (activeArtistsSet?.has(artistUrl)) {
        return true;
      }

      const isHistory = downloadTracks?.some((t) => t.playlistSpotifyUrl === artistUrl);
      return !!isHistory;
    },
    [activeArtistsSet, downloadTracks],
  );

  return { getArtistStatus };
};
