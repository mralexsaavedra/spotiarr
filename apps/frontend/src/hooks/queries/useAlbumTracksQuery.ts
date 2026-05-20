import type { NormalizedTrack } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { artistService } from "@/services/artist.service";
import { STALE_TIME_LONG } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

interface UseAlbumTracksQueryOptions {
  artistId: string;
  albumId: string;
  enabled: boolean;
}

export const useAlbumTracksQuery = ({ artistId, albumId, enabled }: UseAlbumTracksQueryOptions) => {
  return useQuery<NormalizedTrack[], Error>({
    queryKey: queryKeys.artistAlbumTracks(artistId, albumId),
    queryFn: () => artistService.getAlbumTracks(artistId, albumId),
    enabled,
    staleTime: STALE_TIME_LONG,
  });
};
