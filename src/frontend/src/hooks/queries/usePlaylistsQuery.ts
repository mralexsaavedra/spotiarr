import { useQuery } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import { Playlist, PlaylistWithStats } from "../../types/playlist";
import { calculatePlaylistStats } from "../../utils/playlist";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const usePlaylistsQuery = () => {
  return useQuery<Playlist[], Error, PlaylistWithStats[]>({
    queryKey: PLAYLISTS_QUERY_KEY,
    queryFn: () => playlistService.getPlaylists(),
    select: (data) =>
      data.map((playlist) => ({
        ...playlist,
        stats: calculatePlaylistStats(playlist),
      })),
  });
};
