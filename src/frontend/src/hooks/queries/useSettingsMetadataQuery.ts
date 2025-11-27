import { SettingMetadata } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { SETTINGS_METADATA_QUERY_KEY } from "../queryKeys";

export const useSettingsMetadataQuery = () => {
  return useQuery<Record<string, SettingMetadata>>({
    queryKey: SETTINGS_METADATA_QUERY_KEY,
    queryFn: () => api.getSettingsMetadata(),
  });
};
