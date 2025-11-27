import { FC, MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyHistory } from "../components/molecules/EmptyHistory";
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
        <PageHeader title="Download History" />

        {isLoading ? (
          <Loading message="Loading history..." />
        ) : playlists.length === 0 ? (
          <EmptyHistory />
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
