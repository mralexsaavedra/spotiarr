import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { tracksQueryKey } from "../queryKeys";

export const useRetryFailedTracksMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) => api.retryFailedTracks(playlistId),
    onSuccess: (_data, playlistId) => {
      queryClient.invalidateQueries({ queryKey: tracksQueryKey(playlistId) });
    },
  });
};
