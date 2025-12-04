import { useMutation, useQueryClient } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import type { Playlist } from "../../types/playlist";
import { queryKeys } from "../queryKeys";

export const useUpdatePlaylistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Playlist> }) =>
      playlistService.updatePlaylist(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.playlists });
      const previous = queryClient.getQueryData<Playlist[]>(queryKeys.playlists);

      queryClient.setQueryData<Playlist[]>(queryKeys.playlists, (old = []) =>
        old.map((p) => (p.id === id ? { ...p, ...data } : p)),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.playlists, context.previous);
      }
    },
  });
};
