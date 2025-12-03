import { SettingItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "../../services/settings.service";
import { SETTINGS_QUERY_KEY } from "../queryKeys";

export const useSettingsQuery = () => {
  return useQuery<SettingItem[]>({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => settingsService.getSettings(),
  });
};
