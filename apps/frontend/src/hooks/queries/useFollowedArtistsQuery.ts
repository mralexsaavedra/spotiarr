import { ApiErrorCode, FollowedArtist } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "@/services/artist.service";
import { getSettingsCacheTimings } from "@/utils/cache";
import { mapApiError } from "@/utils/spotify";
import { queryKeys } from "../queryKeys";
import { useSettingsQuery } from "./useSettingsQuery";

interface UseFollowedArtistsState {
  artists: FollowedArtist[] | null;
  isLoading: boolean;
  error: ApiErrorCode | null;
}

export const useFollowedArtistsQuery = (): UseFollowedArtistsState => {
  const { data: settings = [] } = useSettingsQuery();
  const { staleTime, gcTime } = getSettingsCacheTimings(settings);

  const { data, isLoading, error } = useQuery<FollowedArtist[], Error>({
    queryKey: queryKeys.followedArtists,
    queryFn: () => artistService.getFollowedArtists(),
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
  });

  const mappedError = mapApiError(error, "failed_to_fetch_followed_artists");

  return {
    artists: data ?? null,
    isLoading,
    error: mappedError,
  };
};
