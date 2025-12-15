import { PlaylistHistory } from "@spotiarr/shared";
import { MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { Playlist } from "@/types";
import { useRecreatePlaylistMutation } from "../mutations/useRecreatePlaylistMutation";
import { useDownloadHistoryQuery } from "../queries/useDownloadHistoryQuery";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";

export const useHistoryController = () => {
  const navigate = useNavigate();
  const { data: history = [], isLoading } = useDownloadHistoryQuery();
  const { data: activePlaylists = [] } = usePlaylistsQuery();
  const recreatePlaylist = useRecreatePlaylistMutation();

  const handleRecreatePlaylistClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, playlistSpotifyUrl: string | null) => {
      event.preventDefault();
      event.stopPropagation();

      if (!playlistSpotifyUrl) {
        return;
      }

      recreatePlaylist.mutate(playlistSpotifyUrl);
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

  return {
    history,
    isLoading,
    activePlaylists,
    recreatePlaylist,
    handleRecreatePlaylistClick,
    handleHistoryItemClick,
  };
};
