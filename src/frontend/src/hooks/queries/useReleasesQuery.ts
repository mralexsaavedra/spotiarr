import { type ArtistRelease } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../../services/api";
import { RELEASES_QUERY_KEY } from "../queryKeys";
import { useSettingsQuery } from "./useSettingsQuery";

interface UseReleasesState {
  releases: ArtistRelease[] | null;
  isLoading: boolean;
  error: "missing_user_access_token" | "spotify_rate_limited" | "failed_to_fetch_releases" | null;
}

export const useReleasesQuery = (): UseReleasesState => {
  const { data: settings = [] } = useSettingsQuery();

  const cacheMinutes = useMemo(() => {
    const setting = settings.find((s) => s.key === "RELEASES_CACHE_MINUTES");
    return setting ? parseInt(setting.value, 10) : 5;
  }, [settings]);

  const { data, isLoading, error } = useQuery<ArtistRelease[], Error>({
    queryKey: RELEASES_QUERY_KEY,
    queryFn: () => api.getReleases(),
    staleTime: 1000 * 60 * cacheMinutes,
  });

  let mappedError: UseReleasesState["error"] = null;
  if (error instanceof Error && error.message === "missing_user_access_token") {
    mappedError = "missing_user_access_token";
  } else if (error instanceof Error && error.message === "spotify_rate_limited") {
    mappedError = "spotify_rate_limited";
  } else if (error) {
    mappedError = "failed_to_fetch_releases";
  }

  return {
    releases: data ?? null,
    isLoading,
    error: mappedError,
  };
};
