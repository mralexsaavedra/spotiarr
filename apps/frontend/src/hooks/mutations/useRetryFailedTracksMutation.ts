import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/contexts/ToastContext";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";

export const useRetryFailedTracksMutation = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (playlistId: string) => playlistService.retryFailedTracks(playlistId),
    onSuccess: (_data, playlistId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tracks(playlistId) });
    },
    onError: (error) => {
      console.error("[useRetryFailedTracksMutation] onError", error);
      toast.error(t("playlist.errors.retryFailedTracks"));
    },
  });
};
