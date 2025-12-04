import { useMutation, useQueryClient } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import { queryKeys } from "../queryKeys";

export const useRetryFailedTracksMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) => playlistService.retryFailedTracks(playlistId),
    onSuccess: (_data, playlistId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tracks(playlistId) });
    },
  });
};
