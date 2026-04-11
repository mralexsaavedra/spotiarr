import { useQuery } from "@tanstack/react-query";
import { trackService } from "@/services/track.service";
import { Track } from "@/types";
import { STALE_TIME_MEDIUM } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const useTracksQuery = (playlistId: string | undefined) => {
  return useQuery<Track[]>({
    queryKey: queryKeys.tracks(playlistId as string),
    queryFn: () => trackService.getTracksByPlaylist(playlistId as string),
    enabled: !!playlistId,
    staleTime: STALE_TIME_MEDIUM,
  });
};
