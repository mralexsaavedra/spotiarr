import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { Track } from "../../types/track";
import { tracksQueryKey } from "../queryKeys";

export const useTracksQuery = (playlistId: string | undefined) => {
  return useQuery<Track[]>({
    queryKey: tracksQueryKey(playlistId as string),
    queryFn: () => api.getTracksByPlaylist(playlistId as string),
    enabled: !!playlistId,
  });
};
