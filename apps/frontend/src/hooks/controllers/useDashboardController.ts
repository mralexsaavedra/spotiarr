import { PlaylistHistory } from "@spotiarr/shared";
import { MouseEvent, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { Playlist } from "@/types";
import { formatLibrarySize } from "@/utils/formatLibrarySize";
import { useRecreatePlaylistMutation } from "../mutations/useRecreatePlaylistMutation";
import { useDownloadHistoryQuery } from "../queries/useDownloadHistoryQuery";
import { useLibraryStatsQuery } from "../queries/useLibraryStatsQuery";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";

export const useDashboardController = () => {
  const navigate = useNavigate();
  const { data: stats } = useLibraryStatsQuery();
  const { data: history = [], isLoading } = useDownloadHistoryQuery();
  const { data: activePlaylists = [] } = usePlaylistsQuery();
  const {
    mutate: recreatePlaylist,
    isPending: isRecreatePending,
    variables: recreateVariables,
  } = useRecreatePlaylistMutation();

  const statsProps = useMemo(() => {
    if (!stats) return null;
    return {
      artists: stats.totalArtists,
      albums: stats.totalAlbums,
      tracks: stats.totalTracks,
      size: formatLibrarySize(stats.totalSize),
    };
  }, [stats]);

  const handleRecreatePlaylistClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => {
      event.preventDefault();
      event.stopPropagation();

      if (!spotifyUrl) {
        return;
      }

      recreatePlaylist(spotifyUrl);
    },
    [recreatePlaylist],
  );

  const handleHistoryItemClick = useCallback(
    (item: PlaylistHistory, activePlaylist?: Playlist) => {
      if (activePlaylist) {
        navigate(Path.PLAYLIST_DETAIL.replace(":id", activePlaylist.id));
      } else if (item.playlistSpotifyUrl) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(item.playlistSpotifyUrl)}`);
      }
    },
    [navigate],
  );

  const historyProps = useMemo(
    () => ({
      history,
      isLoading,
      activePlaylists,
      recreatingUrl: isRecreatePending ? (recreateVariables ?? null) : null,
      onRecreate: handleRecreatePlaylistClick,
      onItemClick: handleHistoryItemClick,
    }),
    [
      history,
      isLoading,
      activePlaylists,
      isRecreatePending,
      recreateVariables,
      handleRecreatePlaylistClick,
      handleHistoryItemClick,
    ],
  );

  return {
    statsProps,
    historyProps,
  };
};
