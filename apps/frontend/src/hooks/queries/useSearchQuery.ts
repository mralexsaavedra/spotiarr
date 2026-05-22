import { useQuery } from "@tanstack/react-query";
import { APP_CONFIG } from "@/config/app";
import { buildStaleWhileRevalidateTimings } from "@/utils/cache";
import { SearchService } from "../../services/search.service";
import { queryKeys } from "../queryKeys";

const SEARCH_QUERY_CACHE_MINUTES = APP_CONFIG.CACHE.DEFAULT_MINUTES;

export const useSearchQuery = (
  query: string,
  types: string[] = ["track", "album", "artist"],
  limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT,
) => {
  const effectiveLimit = types.length === 1 ? APP_CONFIG.SEARCH.DEFAULT_LIMIT : limit;
  const { staleTime, gcTime } = buildStaleWhileRevalidateTimings(SEARCH_QUERY_CACHE_MINUTES);

  return useQuery({
    queryKey: queryKeys.search(query, types, effectiveLimit),
    queryFn: () => SearchService.searchCatalog(query, types, effectiveLimit),
    enabled: !!query,
    retry: false,
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
  });
};
