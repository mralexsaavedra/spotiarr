import type { ArtistRelease } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { artistAlbumsQueryKey } from "../queryKeys";

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
    queryKey: artistAlbumsQueryKey(artistId, limit, offset),
    queryFn: () => api.getArtistAlbums(artistId, limit, offset),
    enabled,
  });
};
