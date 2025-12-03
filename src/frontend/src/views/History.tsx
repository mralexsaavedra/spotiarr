import { PlaylistHistory } from "@spotiarr/shared";
import { FC, MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { HistoryList } from "../components/organisms/HistoryList";
import { useRecreatePlaylistMutation } from "../hooks/mutations/useRecreatePlaylistMutation";
import { useDownloadHistoryQuery } from "../hooks/queries/useDownloadHistoryQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { Path } from "../routes/routes";
import { Playlist } from "../types/playlist";

export const History: FC = () => {
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

  return (
    <section className="w-full bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title="Download History" className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : history.length === 0 ? (
          <EmptyState
            icon="clock-rotate-left"
            title="No download history yet"
            description="Completed downloads will appear here."
          />
        ) : (
          <HistoryList
            history={history}
            activePlaylists={activePlaylists}
            recreatingUrl={recreatePlaylist.isPending ? recreatePlaylist.variables : null}
            onRecreate={handleRecreatePlaylistClick}
            onItemClick={handleHistoryItemClick}
          />
        )}
      </div>
    </section>
  );
};
