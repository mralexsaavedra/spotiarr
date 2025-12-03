import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trackService } from "../../services/track.service";
import { Track } from "../../types/track";
import { tracksQueryKey } from "../queryKeys";

export const useDeleteTrackMutation = (playlistId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string, { previous?: Track[] }>({
    mutationFn: (trackId: string) => trackService.deleteTrack(trackId),
    onMutate: async (trackId: string) => {
      await queryClient.cancelQueries({ queryKey: tracksQueryKey(playlistId) });
      const previous = queryClient.getQueryData<Track[]>(tracksQueryKey(playlistId));

      queryClient.setQueryData<Track[] | undefined>(tracksQueryKey(playlistId), (old = []) =>
        old.filter((t) => t.id !== trackId),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tracksQueryKey(playlistId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tracksQueryKey(playlistId) });
    },
  });
};
