import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../services/api";
import { Playlist, PlaylistStatusEnum } from "../types/playlist";
import { getPlaylistStatus } from "../utils/playlist";
import { PLAYLISTS_QUERY_KEY } from "./queryKeys";

export const usePlaylistStatusMap = () => {
  const { data: playlists } = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
  });

  const statusMap = useMemo(() => {
    const map = new Map<string, PlaylistStatusEnum>();
    if (!playlists) return map;

    playlists.forEach((p: Playlist) => {
      const status = getPlaylistStatus(p);

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

  return { data: statusMap };
};
