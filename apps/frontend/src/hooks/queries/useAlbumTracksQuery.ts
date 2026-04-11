import type { NormalizedTrack } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "@/services/artist.service";
import { queryKeys } from "../queryKeys";

interface UseAlbumTracksQueryOptions {
  artistId: string;
  albumId: string;
  enabled: boolean;
}

export const useAlbumTracksQuery = ({ artistId, albumId, enabled }: UseAlbumTracksQueryOptions) => {
  const STALE_TIME_MS = 5 * 60 * 1000;

  return useQuery<NormalizedTrack[], Error>({
    queryKey: queryKeys.artistAlbumTracks(artistId, albumId),
    queryFn: () => artistService.getAlbumTracks(artistId, albumId),
    enabled,
    staleTime: STALE_TIME_MS,
  });
};
