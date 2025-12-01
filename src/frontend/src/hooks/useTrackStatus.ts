import { TrackStatusEnum } from "@spotiarr/shared";
import { useCallback } from "react";
import { useDownloadTracksQuery } from "./queries/useDownloadTracksQuery";
import { usePlaylistsQuery } from "./queries/usePlaylistsQuery";

export const useTrackStatus = () => {
  const { data: playlists } = usePlaylistsQuery();
  const { data: downloadTracks } = useDownloadTracksQuery();

  const getTrackStatus = useCallback(
    (url: string): TrackStatusEnum | undefined => {
      const activePlaylist = playlists?.find((p) => p.tracks?.some((t) => t.trackUrl === url));
      if (activePlaylist) {
        const track = activePlaylist.tracks?.find((t) => t.trackUrl === url);
        return track?.status;
      }

      const isHistory = downloadTracks?.some((t) => t.trackUrl === url);
      if (isHistory) return TrackStatusEnum.Completed;

      return undefined;
    },
    [playlists, downloadTracks],
  );

  return { getTrackStatus };
};
