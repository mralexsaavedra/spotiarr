import { PlaylistPreview } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { playlistPreviewQueryKey } from "../queryKeys";

export const usePlaylistPreviewQuery = (spotifyUrl: string | null) => {
  return useQuery<PlaylistPreview>({
    queryKey: playlistPreviewQueryKey(spotifyUrl || ""),
    queryFn: () => api.getPlaylistPreview(spotifyUrl!),
    enabled: !!spotifyUrl,
  });
};
