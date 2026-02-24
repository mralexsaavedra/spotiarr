import { LibraryArtist } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchLibraryArtist } from "@/services/library.service";
import { queryKeys } from "../queryKeys";

export const useLibraryArtistQuery = (name: string) => {
  return useQuery<LibraryArtist>({
    queryKey: queryKeys.libraryArtistDetail(name),
    queryFn: () => fetchLibraryArtist({ name, path: "" }),
    enabled: !!name,
  });
};
