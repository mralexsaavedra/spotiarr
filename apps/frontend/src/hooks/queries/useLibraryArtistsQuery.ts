import { useQuery } from "@tanstack/react-query";
import { fetchLibraryArtists } from "@/services/library.service";
import { STALE_TIME_LONG } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useLibraryArtistsQuery = () => {
  return useQuery({
    queryKey: queryKeys.libraryArtists,
    queryFn: fetchLibraryArtists,
    staleTime: STALE_TIME_LONG,
  });
};
