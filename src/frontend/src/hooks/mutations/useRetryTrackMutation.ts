import { TrackStatusEnum } from "@spotiarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { trackService } from "../../services/track.service";
import { Track } from "../../types";
import { queryKeys } from "../queryKeys";

export const useRetryTrackMutation = (playlistId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string, { previous?: Track[] }>({
    mutationFn: (trackId: string) => trackService.retryTrack(trackId),
    onMutate: async (trackId: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tracks(playlistId) });
      const previous = queryClient.getQueryData<Track[]>(queryKeys.tracks(playlistId));

      queryClient.setQueryData<Track[] | undefined>(queryKeys.tracks(playlistId), (old = []) =>
        old.map((t) => (t.id === trackId ? { ...t, status: TrackStatusEnum.Searching } : t)),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.tracks(playlistId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tracks(playlistId) });
    },
  });
};
