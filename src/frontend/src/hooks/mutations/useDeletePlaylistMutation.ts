import { useMutation, useQueryClient } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist.service";
import type { Playlist } from "@/types";
import { queryKeys } from "../queryKeys";

export const useDeletePlaylistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playlistService.deletePlaylist(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlists });
      const previous = queryClient.getQueryData<Playlist[]>(queryKeys.playlists);

      queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) =>
        old.filter((p) => p.id !== id),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.playlists, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
    },
  });
};
