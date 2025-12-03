import { useMutation, useQueryClient } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import type { Playlist } from "../../types/playlist";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const useDeletePlaylistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => playlistService.deletePlaylist(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      const previous = queryClient.getQueryData<Playlist[]>(PLAYLISTS_QUERY_KEY);

      queryClient.setQueryData<Playlist[]>(PLAYLISTS_QUERY_KEY, (old = []) =>
        old.filter((p) => p.id !== id),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PLAYLISTS_QUERY_KEY, context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
    },
  });
};
