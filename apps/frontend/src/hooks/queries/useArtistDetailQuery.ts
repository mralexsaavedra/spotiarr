import type { ApiErrorCode, ArtistDetail } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { artistService } from "@/services/artist.service";
import { mapSpotifyError } from "@/utils/spotify";
import { queryKeys } from "../queryKeys";

const MAX_CATALOG_REFRESH_REFETCHES = 2;
const CATALOG_REFRESH_REFETCH_DELAY_MS = 1500;

interface UseArtistDetailState {
  artist: ArtistDetail | null;
  isLoading: boolean;
  error: ApiErrorCode | null;
}

export const useArtistDetailQuery = (
  artistId: string | null,
  limit: number = 12,
): UseArtistDetailState => {
  const STALE_TIME_MS = 5 * 60 * 1000;
  const refetchAttemptsRef = useRef(0);

  const { data, isLoading, error, refetch } = useQuery<ArtistDetail, Error>({
    queryKey: [...queryKeys.artistDetail(artistId || ""), limit],
    queryFn: () => artistService.getArtistDetail(artistId!, limit),
    enabled: !!artistId,
    staleTime: STALE_TIME_MS,
  });

  // Reset attempts when artist changes or response is no longer pending+empty
  useEffect(() => {
    if (!artistId) {
      refetchAttemptsRef.current = 0;
      return;
    }

    const isPendingEmpty = data?.catalogRefreshPending && data.albums.length === 0;

    if (!isPendingEmpty) {
      refetchAttemptsRef.current = 0;
    }
  }, [artistId, data?.catalogRefreshPending, data?.albums.length]);

  // Bounded refetch while catalog refresh is pending and albums are empty
  useEffect(() => {
    if (!artistId || !data) return;

    const isPendingEmpty = data.catalogRefreshPending && data.albums.length === 0;

    if (!isPendingEmpty) return;
    if (refetchAttemptsRef.current >= MAX_CATALOG_REFRESH_REFETCHES) return;

    refetchAttemptsRef.current += 1;

    const timer = setTimeout(() => {
      void refetch();
    }, CATALOG_REFRESH_REFETCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [artistId, data, refetch]);

  const mappedError = mapSpotifyError(error, "failed_to_fetch_artist_detail");

  return {
    artist: data ?? null,
    isLoading,
    error: mappedError,
  };
};
