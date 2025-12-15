import { useMutation, useQueryClient } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";

export const useRecreatePlaylistMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (spotifyUrl: string) => playlistService.createPlaylist(spotifyUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
    },
  });
};
