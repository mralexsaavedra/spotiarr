import { SettingItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { STALE_TIME_LONG } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useSettingsQuery = () => {
  return useQuery<SettingItem[]>({
    queryKey: queryKeys.settings,
    queryFn: () => settingsService.getSettings(),
    staleTime: STALE_TIME_LONG,
  });
};
