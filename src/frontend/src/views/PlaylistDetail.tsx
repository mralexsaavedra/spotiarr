import { FC, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { Playlist } from "../components/organisms/Playlist";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { usePlaylistController } from "../hooks/controllers/usePlaylistController";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useTracksQuery } from "../hooks/queries/useTracksQuery";
import { Path } from "../routes/routes";

export const PlaylistDetail: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: playlists = [], isLoading: isPlaylistsLoading } = usePlaylistsQuery();
  const { data: tracks = [], isLoading: isTracksLoading } = useTracksQuery(id);

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

  const {
    isDownloading,
    isDownloaded,
    hasFailed,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    mutations: { retryFailedTracks },
  } = usePlaylistController({
    playlist,
    tracks,
    spotifyUrl: playlist?.spotifyUrl,
    id,
  });

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  if (isPlaylistsLoading || isTracksLoading) {
    return <PlaylistSkeleton />;
  }

  if (!playlist) {
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <Playlist
      playlist={playlist}
      tracks={tracks}
      isDownloading={isDownloading}
      isDownloaded={isDownloaded}
      onRetryTrack={(trackId) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) handleRetryTrack(track);
      }}
      onConfirmDelete={handleDelete}
      onRetryFailed={handleRetryFailed}
      hasFailed={hasFailed}
      isRetrying={retryFailedTracks.isPending}
      onToggleSubscription={handleToggleSubscription}
      onDownloadTrack={(track) => handleRetryTrack(track)}
      onDownload={handleRetryFailed}
    />
  );
};
