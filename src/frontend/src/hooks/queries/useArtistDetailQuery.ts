import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { artistDetailQueryKey } from "../queryKeys";

interface ArtistDetail {
  id: string;
  name: string;
  image: string | null;
  topTracks: {
    name: string;
    artist: string;
    primaryArtist: string | undefined;
    primaryArtistImage: string | null;
    artists: { name: string; url: string | undefined }[];
    trackUrl: string | undefined;
    album: string | undefined;
    albumCoverUrl: string | undefined;
    albumYear: number | undefined;
    trackNumber: number;
    previewUrl: string | null | undefined;
  }[];
}

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

  let mappedError: UseArtistDetailState["error"] = null;
  if (error instanceof Error && error.message === "missing_user_access_token") {
    mappedError = "missing_user_access_token";
  } else if (error instanceof Error && error.message === "spotify_rate_limited") {
    mappedError = "spotify_rate_limited";
  } else if (error) {
    mappedError = "failed_to_fetch_artist_detail";
  }

  return {
    artist: data ?? null,
    isLoading,
    error: mappedError,
  };
};
