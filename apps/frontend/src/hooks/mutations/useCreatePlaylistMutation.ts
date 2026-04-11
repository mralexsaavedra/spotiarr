import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";

export const useCreatePlaylistMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (spotifyUrl: string) => playlistService.createPlaylist(spotifyUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
    },
    onError: (error) => {
      console.error("[useCreatePlaylistMutation] onError", error);
      toast.error(t("playlist.errors.createFailed"));
    },
  });
};
