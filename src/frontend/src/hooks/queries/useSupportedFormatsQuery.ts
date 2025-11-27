import { SupportedAudioFormat } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { SUPPORTED_FORMATS_QUERY_KEY } from "../queryKeys";

export const useSupportedFormatsQuery = () => {
  return useQuery<SupportedAudioFormat[]>({
    queryKey: SUPPORTED_FORMATS_QUERY_KEY,
    queryFn: () => api.getSupportedFormats(),
  });
};
