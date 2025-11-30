import { FC, MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { HistoryItem } from "../components/molecules/HistoryItem";
import { useRecreatePlaylistMutation } from "../hooks/mutations/useRecreatePlaylistMutation";
import { useDownloadHistoryQuery } from "../hooks/queries/useDownloadHistoryQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { Path } from "../routes/routes";

export const History: FC = () => {
  const navigate = useNavigate();

  const { data: playlists = [], isLoading } = useDownloadHistoryQuery();
  const { data: activePlaylists = [] } = usePlaylistsQuery();
  const recreatePlaylist = useRecreatePlaylistMutation();

  const handleRecreatePlaylistClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>, playlistSpotifyUrl: string | null) => {
      event.preventDefault();
      event.stopPropagation();
      if (!playlistSpotifyUrl) return;
      recreatePlaylist.mutate(playlistSpotifyUrl, {
        onSuccess: () => {
          navigate(Path.HOME);
        },
      });
    },
    [recreatePlaylist, navigate],
  );

  return (
    <section className="w-full bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title="Download History" className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : playlists.length === 0 ? (
          <EmptyState
            icon="fa-clock-rotate-left"
            title="No download history yet"
            description="Completed downloads will appear here."
          />
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_150px_120px] gap-4 px-4 py-2 border-b border-white/10 text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">
              <div>Title</div>
              <div className="hidden md:block text-right">Tracks</div>
              <div className="hidden md:block text-right">Completed</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="flex flex-col gap-1">
              {playlists.map((playlist) => {
                const activePlaylist = activePlaylists.find(
                  (p) => p.spotifyUrl === playlist.playlistSpotifyUrl,
                );

                return (
                  <HistoryItem
                    key={
                      playlist.playlistId ?? playlist.playlistSpotifyUrl ?? playlist.playlistName
                    }
                    playlistName={playlist.playlistName}
                    playlistSpotifyUrl={playlist.playlistSpotifyUrl}
                    trackCount={playlist.trackCount}
                    lastCompletedAt={playlist.lastCompletedAt}
                    isRecreating={recreatePlaylist.isPending}
                    isDisabled={!!activePlaylist}
                    activePlaylistId={activePlaylist?.id}
                    onRecreate={handleRecreatePlaylistClick}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
