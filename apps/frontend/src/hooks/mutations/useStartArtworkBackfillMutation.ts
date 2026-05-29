import { ArtworkBackfillStartResponse } from "@spotiarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startArtworkBackfill } from "@/services/artworkBackfill.service";
import { queryKeys } from "../queryKeys";

export const useStartArtworkBackfillMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ArtworkBackfillStartResponse, Error, void>({
    mutationFn: startArtworkBackfill,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.artworkBackfillStatus });
    },
  });
};
