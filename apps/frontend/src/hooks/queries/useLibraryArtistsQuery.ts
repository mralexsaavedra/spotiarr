import { useQuery } from "@tanstack/react-query";
import { fetchLibraryArtists } from "@/services/library.service";
import { queryKeys } from "../queryKeys";

export const useLibraryArtistsQuery = () => {
  return useQuery({
    queryKey: queryKeys.libraryArtists,
    queryFn: fetchLibraryArtists,
    staleTime: 60 * 1000,
  });
};
