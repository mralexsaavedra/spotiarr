import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import type { Playlist } from "../../types/playlist";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const useUpdatePlaylistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Playlist> }) =>
      api.updatePlaylist(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      const previous = queryClient.getQueryData<Playlist[]>(PLAYLISTS_QUERY_KEY);

      queryClient.setQueryData<Playlist[]>(PLAYLISTS_QUERY_KEY, (old = []) =>
        old.map((p) => (p.id === id ? { ...p, ...data } : p)),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PLAYLISTS_QUERY_KEY, context.previous);
      }
    },
  });
};
