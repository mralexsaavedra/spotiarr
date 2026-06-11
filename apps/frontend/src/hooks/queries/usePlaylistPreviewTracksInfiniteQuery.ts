import { PlaylistPreviewTracksPage } from "@spotiarr/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { playlistService } from "@/services/playlist.service";
import { STALE_TIME_MEDIUM } from "@/utils/cache";
import { queryKeys } from "../queryKeys";

export const PLAYLIST_PREVIEW_PAGE_SIZE = 100;

export const usePlaylistPreviewTracksInfiniteQuery = (
  spotifyUrl: string | null,
  initialPageParam: number,
  enabled: boolean,
) => {
  return useInfiniteQuery<
    PlaylistPreviewTracksPage,
    Error,
    import("@tanstack/react-query").InfiniteData<PlaylistPreviewTracksPage>,
    ReturnType<typeof queryKeys.playlistPreviewTracks>,
    number
  >({
    queryKey: queryKeys.playlistPreviewTracks(spotifyUrl ?? ""),
    queryFn: ({ pageParam }) =>
      playlistService.getPlaylistPreviewTracksPage(
        spotifyUrl!,
        pageParam,
        PLAYLIST_PREVIEW_PAGE_SIZE,
      ),
    initialPageParam,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: !!spotifyUrl && enabled,
    staleTime: STALE_TIME_MEDIUM,
  });
};
