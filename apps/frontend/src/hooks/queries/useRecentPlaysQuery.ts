import { RecentPlayItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { historyService } from "@/services/history.service";
import { STALE_TIME_MEDIUM } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useRecentPlaysQuery = (limit: number = 20) => {
  return useQuery<RecentPlayItem[]>({
    queryKey: queryKeys.historyRecentPlays,
    queryFn: () => historyService.getRecentPlays(limit),
    staleTime: STALE_TIME_MEDIUM,
  });
};
