import { PlaylistPreview } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";

export const usePlaylistPreviewQuery = (spotifyUrl: string | null) => {
  return useQuery<PlaylistPreview>({
    queryKey: queryKeys.playlistPreview(spotifyUrl || ""),
    queryFn: () => playlistService.getPlaylistPreview(spotifyUrl!),
    enabled: !!spotifyUrl,
  });
};
