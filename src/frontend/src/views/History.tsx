import { FC, MouseEvent, useCallback, useState } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { HistoryList } from "../components/organisms/HistoryList";
import { useRecreatePlaylistMutation } from "../hooks/mutations/useRecreatePlaylistMutation";
import { useDownloadHistoryQuery } from "../hooks/queries/useDownloadHistoryQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";

export const History: FC = () => {
  const { data: history = [], isLoading } = useDownloadHistoryQuery();
  const { data: activePlaylists = [] } = usePlaylistsQuery();
  const recreatePlaylist = useRecreatePlaylistMutation();
  const [recreatingUrl, setRecreatingUrl] = useState<string | null>(null);

  const handleRecreatePlaylistClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, playlistSpotifyUrl: string | null) => {
      event.preventDefault();
      event.stopPropagation();
      if (!playlistSpotifyUrl) return;

      setRecreatingUrl(playlistSpotifyUrl);
      recreatePlaylist.mutate(playlistSpotifyUrl, {
        onSettled: () => setRecreatingUrl(null),
      });
    },
    [recreatePlaylist],
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
            recreatingUrl={recreatingUrl}
            onRecreate={handleRecreatePlaylistClick}
          />
        )}
      </div>
    </section>
  );
};
