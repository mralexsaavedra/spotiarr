import { useQuery } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import { Playlist, PlaylistWithStats } from "../../types";
import { calculatePlaylistStats } from "../../utils/playlist";
import { queryKeys } from "../queryKeys";

export const usePlaylistsQuery = () => {
  return useQuery<Playlist[], Error, PlaylistWithStats[]>({
    queryKey: queryKeys.playlists,
    queryFn: () => playlistService.getPlaylists(),
    select: (data) =>
      data.map((playlist) => ({
        ...playlist,
        stats: calculatePlaylistStats(playlist),
      })),
  });
};
