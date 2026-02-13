import { type LibraryStats } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchLibraryStats } from "@/services/library.service";
import { queryKeys } from "../queryKeys";

export const useLibraryStatsQuery = () => {
  return useQuery<LibraryStats, Error>({
    queryKey: queryKeys.libraryStats,
    queryFn: fetchLibraryStats,
    refetchInterval: 30000,
  });
};
