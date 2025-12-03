import { SettingMetadata } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "../../services/settings.service";
import { SETTINGS_METADATA_QUERY_KEY } from "../queryKeys";

export const useSettingsMetadataQuery = () => {
  return useQuery<Record<string, SettingMetadata>>({
    queryKey: SETTINGS_METADATA_QUERY_KEY,
    queryFn: () => settingsService.getSettingsMetadata(),
  });
};
