import { TopTrackItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { historyService } from "@/services/history.service";
import { STALE_TIME_MEDIUM } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useTopTracksQuery = (limit: number = 10) => {
  return useQuery<TopTrackItem[]>({
    queryKey: queryKeys.historyTopTracks,
    queryFn: () => historyService.getTopTracks(limit),
    staleTime: STALE_TIME_MEDIUM,
  });
};
