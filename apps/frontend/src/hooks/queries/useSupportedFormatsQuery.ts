import { SupportedAudioFormat } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "../queryKeys";

export const useSupportedFormatsQuery = () => {
  return useQuery<SupportedAudioFormat[]>({
    queryKey: queryKeys.supportedFormats,
    queryFn: () => settingsService.getSupportedFormats(),
  });
};
