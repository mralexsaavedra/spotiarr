import { SettingItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "../queryKeys";

export const useSettingsQuery = () => {
  return useQuery<SettingItem[]>({
    queryKey: queryKeys.settings,
    queryFn: () => settingsService.getSettings(),
  });
};
