import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "../queryKeys";

export const useUpdateSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Array<{ key: string; value: string }>) =>
      settingsService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      queryClient.invalidateQueries({ queryKey: queryKeys.releases });
      queryClient.invalidateQueries({ queryKey: queryKeys.followedArtists });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "artist-detail" || query.queryKey[0] === "artist-albums",
      });
    },
  });
};
