import type { ApiErrorCode, ArtistDetail } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { mapSpotifyError } from "../../utils/spotify";
import { artistDetailQueryKey } from "../queryKeys";

interface UseArtistDetailState {
  artist: ArtistDetail | null;
  isLoading: boolean;
  error: ApiErrorCode | null;
}

export const useArtistDetailQuery = (
  artistId: string | null,
  limit: number = 12,
): UseArtistDetailState => {
  const { data, isLoading, error } = useQuery<ArtistDetail, Error>({
    queryKey: [...artistDetailQueryKey(artistId || ""), limit],
    queryFn: () => api.getArtistDetail(artistId!, limit),
    enabled: !!artistId,
  });

  const mappedError = mapSpotifyError(error, "failed_to_fetch_artist_detail");

  return {
    artist: data ?? null,
    isLoading,
    error: mappedError,
  };
};
