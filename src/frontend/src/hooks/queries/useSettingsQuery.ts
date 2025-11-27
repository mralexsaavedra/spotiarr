import { SettingItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { SETTINGS_QUERY_KEY } from "../queryKeys";

export const useSettingsQuery = () => {
  return useQuery<SettingItem[]>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => api.getSettings(),
  });
};
