import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Playlist, PlaylistStatusEnum } from "../types/playlist";
import { getPlaylistStatus } from "../utils/playlist";
import { PLAYLISTS_QUERY_KEY } from "./queryKeys";

export const usePlaylistStatusMap = () => {
  return useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
    select: (playlists: Playlist[]) => {
      const map = new Map<string, PlaylistStatusEnum>();
      playlists.forEach((p) => {
        if (p.spotifyUrl) {
          map.set(p.spotifyUrl, getPlaylistStatus(p));
        }
      });
      return map;
    },
  });
};
