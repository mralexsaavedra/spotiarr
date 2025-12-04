import { ApiErrorCode, type ArtistRelease } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { artistService } from "../../services/artist.service";
import { getCacheMinutesFromSettings } from "../../utils/cache";
import { mapSpotifyError } from "../../utils/spotify";
import { queryKeys } from "../queryKeys";
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
    queryKey: queryKeys.releases,
    queryFn: () => artistService.getReleases(),
    staleTime: 1000 * 60 * cacheMinutes,
  });

  const mappedError = mapSpotifyError(error, "failed_to_fetch_releases");

  return {
    releases: data ?? null,
    isLoading,
    error: mappedError,
  };
};
