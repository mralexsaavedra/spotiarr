import type { ApiErrorCode, ArtistDetail } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "../../services/artist.service";
import { mapSpotifyError } from "../../utils/spotify";
import { queryKeys } from "../queryKeys";

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
    queryKey: [...queryKeys.artistDetail(artistId || ""), limit],
    queryFn: () => artistService.getArtistDetail(artistId!, limit),
    enabled: !!artistId,
  });

  const mappedError = mapSpotifyError(error, "failed_to_fetch_artist_detail");

  return {
    artist: data ?? null,
    isLoading,
    error: mappedError,
  };
};
