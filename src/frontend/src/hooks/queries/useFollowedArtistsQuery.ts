import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../../services/api";
import { FOLLOWED_ARTISTS_QUERY_KEY } from "../queryKeys";
import { useSettingsQuery } from "./useSettingsQuery";

interface FollowedArtist {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
}

interface UseFollowedArtistsState {
  artists: FollowedArtist[] | null;
  isLoading: boolean;
  error:
    | "missing_user_access_token"
    | "spotify_rate_limited"
    | "failed_to_fetch_followed_artists"
    | null;
}

export const useFollowedArtistsQuery = (): UseFollowedArtistsState => {
  const { data: settings = [] } = useSettingsQuery();

  const cacheMinutes = useMemo(() => {
    const setting = settings.find((s) => s.key === "RELEASES_CACHE_MINUTES");
    return setting ? parseInt(setting.value, 10) : 5;
  }, [settings]);

  const { data, isLoading, error } = useQuery<FollowedArtist[], Error>({
    queryKey: FOLLOWED_ARTISTS_QUERY_KEY,
    queryFn: () => api.getFollowedArtists(),
    staleTime: 1000 * 60 * cacheMinutes,
  });

  let mappedError: UseFollowedArtistsState["error"] = null;
  if (error instanceof Error && error.message === "missing_user_access_token") {
    mappedError = "missing_user_access_token";
  } else if (error instanceof Error && error.message === "spotify_rate_limited") {
    mappedError = "spotify_rate_limited";
  } else if (error) {
    mappedError = "failed_to_fetch_followed_artists";
  }

  return {
    artists: data ?? null,
    isLoading,
    error: mappedError,
  };
};
