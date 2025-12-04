import { useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "../../services/settings.service";
import { queryKeys } from "../queryKeys";

export const useUpdateSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Array<{ key: string; value: string }>) =>
      settingsService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
};
