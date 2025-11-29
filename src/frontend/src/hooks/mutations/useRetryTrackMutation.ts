import { TrackStatusEnum } from "@spotiarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { Track } from "../../types/track";
import { tracksQueryKey } from "../queryKeys";

export const useRetryTrackMutation = (playlistId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string, { previous?: Track[] }>({
    mutationFn: (trackId: string) => api.retryTrack(trackId),
    onMutate: async (trackId: string) => {
      await queryClient.cancelQueries({ queryKey: tracksQueryKey(playlistId) });
      const previous = queryClient.getQueryData<Track[]>(tracksQueryKey(playlistId));

      queryClient.setQueryData<Track[] | undefined>(tracksQueryKey(playlistId), (old = []) =>
        old.map((t) => (t.id === trackId ? { ...t, status: TrackStatusEnum.Searching } : t)),
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
