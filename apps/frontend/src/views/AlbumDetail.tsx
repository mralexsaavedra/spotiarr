import { FC } from "react";
import { PlaylistNotFound } from "@/components/molecules/PlaylistNotFound";
import { PreviewError } from "@/components/molecules/PreviewError";
import { Playlist } from "@/components/organisms/Playlist";
import { PlaylistSkeleton } from "@/components/skeletons/PlaylistSkeleton";
import { useAlbumDetailController } from "@/hooks/controllers/useAlbumDetailController";

export const AlbumDetail: FC = () => {
  const {
    playlist,
    tracks,
    isLoading,
    error,
    isButtonLoading,
    hasMoreTracks,
    isLoadingMoreTracks,
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
    onLoadMoreTracks,
    handleGoBack,
    handleGoHome,
  } = useAlbumDetailController();

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
      hasMoreTracks={hasMoreTracks}
      isLoadingMoreTracks={isLoadingMoreTracks}
      onDownloadTrack={handleRetryTrack}
      onDownload={handleDownload}
      onLoadMoreTracks={onLoadMoreTracks}
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
