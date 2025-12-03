import { FC } from "react";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { Playlist } from "../components/organisms/Playlist";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { usePlaylistDetailController } from "../hooks/controllers/usePlaylistDetailController";

export const PlaylistDetail: FC = () => {
  const {
    playlist,
    tracks,
    isPlaylistsLoading,
    isTracksLoading,
    isDownloading,
    isDownloaded,
    hasFailed,
    retryFailedTracks,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    handleGoHome,
  } = usePlaylistDetailController();

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
