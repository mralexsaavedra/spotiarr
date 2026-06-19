import { TopArtistItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { historyService } from "@/services/history.service";
import { STALE_TIME_MEDIUM } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useTopArtistsQuery = (limit: number = 10) => {
  return useQuery<TopArtistItem[]>({
    queryKey: queryKeys.historyTopArtists(limit),
    queryFn: () => historyService.getTopArtists(limit),
    staleTime: STALE_TIME_MEDIUM,
  });
};
