import { FC } from "react";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { PreviewError } from "../components/molecules/PreviewError";
import { Playlist } from "../components/organisms/Playlist";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { usePlaylistPreviewController } from "../hooks/controllers/usePlaylistPreviewController";

export const PlaylistPreview: FC = () => {
  const {
    playlist,
    tracks,
    isLoading,
    error,
    isButtonLoading,
    isDownloaded,
    isSaved,
    hasFailed,
    completedCount,
    displayTitle,
    handleDownload,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    handleGoBack,
    handleGoHome,
  } = usePlaylistPreviewController();

  if (isLoading) {
    return <PlaylistSkeleton />;
  }

  if (error) {
    return <PreviewError error={error} onGoBack={handleGoBack} />;
  }

  if (!playlist) {
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <Playlist
      playlist={playlist}
      tracks={tracks}
      hasFailed={hasFailed}
      isRetrying={false}
      isDownloading={isButtonLoading}
      isDownloaded={isDownloaded}
      isSaved={isSaved}
      displayTitle={displayTitle}
      completedCount={completedCount}
      onDownloadTrack={handleRetryTrack}
      onDownload={handleDownload}
      onRetryTrack={(trackId) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) handleRetryTrack(track);
      }}
      onConfirmDelete={handleDelete}
      onRetryFailed={handleRetryFailed}
      onToggleSubscription={handleToggleSubscription}
    />
  );
};
