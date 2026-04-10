import { ApiErrorCode, type ArtistRelease } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "@/services/artist.service";
import { getSettingsCacheTimings } from "@/utils/cache";
import { mapSpotifyError } from "@/utils/spotify";
import { queryKeys } from "../queryKeys";
import { useSettingsQuery } from "./useSettingsQuery";

interface UseReleasesState {
  releases: ArtistRelease[] | null;
  isLoading: boolean;
  error: ApiErrorCode | null;
}

export const useReleasesQuery = (): UseReleasesState => {
  const { data: settings = [] } = useSettingsQuery();
  const { staleTime, gcTime } = getSettingsCacheTimings(settings);

  const { data, isLoading, error } = useQuery<ArtistRelease[], Error>({
    queryKey: queryKeys.releases,
    queryFn: () => artistService.getReleases(),
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
  });

  const mappedError = mapSpotifyError(error, "failed_to_fetch_releases");

  return {
    releases: data ?? null,
    isLoading,
    error: mappedError,
  };
};
