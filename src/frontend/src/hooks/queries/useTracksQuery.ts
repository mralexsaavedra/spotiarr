import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { Track } from "../../types/track";
import { tracksQueryKey } from "../queryKeys";

export const useTracksQuery = (playlistId: string) => {
  return useQuery<Track[]>({
    queryKey: tracksQueryKey(playlistId),
    queryFn: () => api.getTracksByPlaylist(playlistId),
    enabled: !!playlistId,
  });
};
