import { FC, MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { HistoryItem } from "../components/molecules/HistoryItem";
import { HistorySkeleton } from "../components/skeletons/HistorySkeleton";
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
          <HistorySkeleton />
        ) : playlists.length === 0 ? (
          <EmptyState
            icon="fa-clock-rotate-left"
            title="No download history yet"
            description="Completed downloads will appear here."
          />
        ) : (
          <div className="space-y-3">
            {playlists.map((playlist) => (
              <HistoryItem
                key={playlist.playlistId ?? playlist.playlistSpotifyUrl ?? playlist.playlistName}
                playlistName={playlist.playlistName}
                playlistSpotifyUrl={playlist.playlistSpotifyUrl}
                trackCount={playlist.trackCount}
                lastCompletedAt={playlist.lastCompletedAt}
                isRecreating={recreatePlaylist.isPending}
                isDisabled={activePlaylists.some(
                  (p) => p.spotifyUrl === playlist.playlistSpotifyUrl,
                )}
                onRecreate={handleRecreatePlaylistClick}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
