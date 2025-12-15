import { SpotifyPlaylist } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";

export const useMyPlaylistsQuery = () => {
  return useQuery<SpotifyPlaylist[]>({
    queryKey: queryKeys.myPlaylists,
    queryFn: () => playlistService.getMyPlaylists(),
  });
};
