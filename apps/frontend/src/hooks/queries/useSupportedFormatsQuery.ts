import { SupportedAudioFormat } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { STALE_TIME_LONG } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useSupportedFormatsQuery = () => {
  return useQuery<SupportedAudioFormat[]>({
    queryKey: queryKeys.supportedFormats,
    queryFn: () => settingsService.getSupportedFormats(),
    staleTime: STALE_TIME_LONG,
  });
};
