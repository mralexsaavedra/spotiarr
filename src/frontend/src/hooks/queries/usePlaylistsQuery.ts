import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { Playlist, PlaylistWithStats } from "../../types/playlist";
import { calculatePlaylistStats } from "../../utils/playlist";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const usePlaylistsQuery = () => {
  return useQuery<Playlist[], Error, PlaylistWithStats[]>({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
    select: (data) =>
      data.map((playlist) => ({
        ...playlist,
        stats: calculatePlaylistStats(playlist),
      })),
  });
};
