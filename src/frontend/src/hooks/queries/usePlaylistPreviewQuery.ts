import { PlaylistPreview } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import { playlistPreviewQueryKey } from "../queryKeys";

export const usePlaylistPreviewQuery = (spotifyUrl: string | null) => {
  return useQuery<PlaylistPreview>({
    queryKey: playlistPreviewQueryKey(spotifyUrl || ""),
    queryFn: () => playlistService.getPlaylistPreview(spotifyUrl!),
    enabled: !!spotifyUrl,
  });
};
