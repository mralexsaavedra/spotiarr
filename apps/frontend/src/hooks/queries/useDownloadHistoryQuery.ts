import { PlaylistHistory } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { historyService } from "@/services/history.service";
import { STALE_TIME_MEDIUM } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useDownloadHistoryQuery = () => {
  return useQuery<PlaylistHistory[]>({
    queryKey: queryKeys.downloadHistory,
    queryFn: () => historyService.getDownloadHistory(),
    staleTime: STALE_TIME_MEDIUM,
  });
};
