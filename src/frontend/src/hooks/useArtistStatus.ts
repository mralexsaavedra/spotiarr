import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { api } from "../services/api";
import { Playlist } from "../types/playlist";
import { useDownloadTracksQuery } from "./queries/useDownloadTracksQuery";
import { PLAYLISTS_QUERY_KEY } from "./queryKeys";

const selectActiveArtistsSet = (data: Playlist[]) => {
  const set = new Set<string>();
  data.forEach((p) => {
    if (p.spotifyUrl) set.add(p.spotifyUrl);
  });
  return set;
};

export const useArtistStatus = () => {
  const { data: activeArtistsSet } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
    select: selectActiveArtistsSet,
  });

  const { data: downloadTracks } = useDownloadTracksQuery();

  const downloadArtistsSet = useMemo(() => {
    if (!downloadTracks) return new Set<string>();
    return new Set(downloadTracks.map((t) => t.playlistSpotifyUrl).filter(Boolean) as string[]);
  }, [downloadTracks]);

  const getArtistStatus = useCallback(
    (artistUrl: string | undefined | null): boolean => {
      if (!artistUrl) return false;

      if (activeArtistsSet?.has(artistUrl)) {
        return true;
      }

      return downloadArtistsSet.has(artistUrl);
    },
    [activeArtistsSet, downloadArtistsSet],
  );

  return { getArtistStatus };
};
