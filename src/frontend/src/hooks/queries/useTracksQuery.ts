import { useQuery } from "@tanstack/react-query";
import { trackService } from "../../services/track.service";
import { Track } from "../../types/track";
import { tracksQueryKey } from "../queryKeys";

export const useTracksQuery = (playlistId: string | undefined) => {
  return useQuery<Track[]>({
    queryKey: tracksQueryKey(playlistId as string),
    queryFn: () => trackService.getTracksByPlaylist(playlistId as string),
    enabled: !!playlistId,
  });
};
