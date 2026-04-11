import { SettingMetadata } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { STALE_TIME_LONG } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useSettingsMetadataQuery = () => {
  return useQuery<Record<string, SettingMetadata>>({
    queryKey: queryKeys.settingsMetadata,
    queryFn: () => settingsService.getSettingsMetadata(),
    staleTime: STALE_TIME_LONG,
  });
};
