import { useQuery } from "@tanstack/react-query";
import { SearchService } from "../../services/search.service";
import { queryKeys } from "../queryKeys";

export const useSearchQuery = (
  query: string,
  types: string[] = ["track", "album", "artist"],
  limit: number = 20,
) => {
  return useQuery({
    queryKey: queryKeys.search(query, types, limit),
    queryFn: () => SearchService.searchCatalog(query, types, limit),
    enabled: !!query,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
