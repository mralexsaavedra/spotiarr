import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { PLAYLISTS_QUERY_KEY } from "../queryKeys";

export const useCreatePlaylistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spotifyUrl: string) => api.createPlaylist(spotifyUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
    },
  });
};
