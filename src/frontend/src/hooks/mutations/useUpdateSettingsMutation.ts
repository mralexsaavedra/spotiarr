import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import { SETTINGS_QUERY_KEY } from "../queryKeys";

export const useUpdateSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Array<{ key: string; value: string }>) => api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
};
