import { useMutation, useQueryClient } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";

export const useDeleteCompletedPlaylistsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => playlistService.deleteCompletedPlaylists(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
    },
  });
};
