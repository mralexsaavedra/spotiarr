import { SupportedAudioFormat } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "../../services/settings.service";
import { SUPPORTED_FORMATS_QUERY_KEY } from "../queryKeys";

export const useSupportedFormatsQuery = () => {
  return useQuery<SupportedAudioFormat[]>({
    queryKey: SUPPORTED_FORMATS_QUERY_KEY,
    queryFn: () => settingsService.getSupportedFormats(),
  });
};
