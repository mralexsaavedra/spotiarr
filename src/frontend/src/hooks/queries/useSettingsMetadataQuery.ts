import { SettingMetadata } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "../queryKeys";

export const useSettingsMetadataQuery = () => {
  return useQuery<Record<string, SettingMetadata>>({
    queryKey: queryKeys.settingsMetadata,
    queryFn: () => settingsService.getSettingsMetadata(),
  });
};
