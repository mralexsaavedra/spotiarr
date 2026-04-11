import { SpotifyPlaylist } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist.service";
import { STALE_TIME_MEDIUM } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useMyPlaylistsQuery = () => {
  return useQuery<SpotifyPlaylist[]>({
    queryKey: queryKeys.myPlaylists,
    queryFn: () => playlistService.getMyPlaylists(),
    staleTime: STALE_TIME_MEDIUM,
  });
};
