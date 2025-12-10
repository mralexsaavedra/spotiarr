import type { ArtistRelease } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "@/services/artist.service";
import { queryKeys } from "../queryKeys";

interface UseArtistAlbumsQueryOptions {
  artistId: string;
  limit: number;
  offset: number;
  enabled?: boolean;
}

export const useArtistAlbumsQuery = ({
  artistId,
  limit,
  offset,
  enabled = true,
}: UseArtistAlbumsQueryOptions) => {
  return useQuery<ArtistRelease[], Error>({
    queryKey: queryKeys.artistAlbums(artistId, limit, offset),
    queryFn: () => artistService.getArtistAlbums(artistId, limit, offset),
    enabled,
  });
};
