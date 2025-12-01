import { ApiErrorCode, type ArtistRelease } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../../services/api";
import { getCacheMinutesFromSettings } from "../../utils/cache";
import { mapSpotifyError } from "../../utils/spotify";
import { RELEASES_QUERY_KEY } from "../queryKeys";
import { useSettingsQuery } from "./useSettingsQuery";

interface UseReleasesState {
  releases: ArtistRelease[] | null;
  isLoading: boolean;
  error: ApiErrorCode | null;
}

export const useReleasesQuery = (): UseReleasesState => {
  const { data: settings = [] } = useSettingsQuery();

  const cacheMinutes = useMemo(() => {
    return getCacheMinutesFromSettings(settings);
  }, [settings]);

  const { data, isLoading, error } = useQuery<ArtistRelease[], Error>({
    queryKey: RELEASES_QUERY_KEY,
    queryFn: () => api.getReleases(),
    staleTime: 1000 * 60 * cacheMinutes,
  });

  const mappedError = mapSpotifyError(error, "failed_to_fetch_releases");

  return {
    releases: data ?? null,
    isLoading,
    error: mappedError,
  };
};
