import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { Playlist } from "../../types/playlist";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const usePlaylistsQuery = () => {
  return useQuery<Playlist[]>({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => api.getPlaylists(),
  });
};
