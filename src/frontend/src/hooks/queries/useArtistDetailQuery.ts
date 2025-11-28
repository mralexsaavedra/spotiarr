import type { ArtistDetail } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { mapSpotifyError } from "../../utils/spotify";
import { artistDetailQueryKey } from "../queryKeys";

interface UseArtistDetailState {
  artist: ArtistDetail | null;
  isLoading: boolean;
  error:
    | "missing_user_access_token"
    | "spotify_rate_limited"
    | "failed_to_fetch_artist_detail"
    | null;
}

export const useArtistDetailQuery = (artistId: string | null): UseArtistDetailState => {
  const { data, isLoading, error } = useQuery<ArtistDetail, Error>({
    queryKey: artistDetailQueryKey(artistId || ""),
    queryFn: () => api.getArtistDetail(artistId!),
    enabled: !!artistId,
  });

  const mappedError = mapSpotifyError(error, "failed_to_fetch_artist_detail");

  return {
    artist: data ?? null,
    isLoading,
    error: mappedError,
  };
};
