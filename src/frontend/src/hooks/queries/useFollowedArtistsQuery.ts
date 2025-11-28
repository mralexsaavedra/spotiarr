import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../../services/api";
import { getCacheMinutesFromSettings } from "../../utils/cache";
import { mapSpotifyError } from "../../utils/spotify";
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
    return getCacheMinutesFromSettings(settings);
  }, [settings]);

  const { data, isLoading, error } = useQuery<FollowedArtist[], Error>({
    queryKey: FOLLOWED_ARTISTS_QUERY_KEY,
    queryFn: () => api.getFollowedArtists(),
    staleTime: 1000 * 60 * cacheMinutes,
  });

  const mappedError = mapSpotifyError(error, "failed_to_fetch_followed_artists");

  return {
    artists: data ?? null,
    isLoading,
    error: mappedError,
  };
};
