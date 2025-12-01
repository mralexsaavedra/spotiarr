import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const useDeleteCompletedPlaylistsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.deleteCompletedPlaylists(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
    },
  });
};
