import { useMutation, useQueryClient } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const useDeleteCompletedPlaylistsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => playlistService.deleteCompletedPlaylists(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
    },
  });
};
