import { FC } from "react";
import { useTranslation } from "react-i18next";
import { PlaylistNotFound } from "@/components/molecules/PlaylistNotFound";
import { Playlist } from "@/components/organisms/Playlist";
import { PlaylistSkeleton } from "@/components/skeletons/PlaylistSkeleton";
import { usePlaylistDetailController } from "@/hooks/controllers/usePlaylistDetailController";

export const PlaylistDetail: FC = () => {
  const { t } = useTranslation();
  const {
    playlist,
    tracks,
    isPlaylistsLoading,
    isTracksLoading,
    isDownloading,
    isDownloaded,
    hasFailed,
    completedCount,
    displayTitle,
    retryFailedTracks,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    handleGoHome,
    onPlayTrack,
    onPauseTrack,
    onPlayPlaylist,
    onPausePlaylist,
    currentTrackId,
    isPlaying,
    hasPlayableTracks,
    isShuffleActive,
    onShufflePlay,
    mode,
  } = usePlaylistDetailController();

  if (isPlaylistsLoading || isTracksLoading) {
    return <PlaylistSkeleton />;
  }

  if (!playlist) {
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <main className="flex flex-1 flex-col">
      <Playlist
        playlist={playlist}
        tracks={tracks}
        isDownloading={isDownloading}
        isDownloaded={isDownloaded}
        displayTitle={displayTitle}
        completedCount={completedCount}
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
        onDownloadOrRetry={handleRetryFailed}
        onPlayTrack={onPlayTrack}
        onPauseTrack={onPauseTrack}
        onPlayPlaylist={onPlayPlaylist}
        onPausePlaylist={onPausePlaylist}
        currentTrackId={currentTrackId}
        isPlaying={isPlaying}
        hasPlayableTracks={hasPlayableTracks}
        onShufflePlay={onShufflePlay}
        isShuffleActive={isShuffleActive}
        mode={mode}
      />
      {!hasPlayableTracks && tracks.length > 0 ? (
        <p className="text-text-secondary px-6 py-3 text-sm" role="status" aria-live="polite">
          {t("playlist.noPlayableTracks")}
        </p>
      ) : null}
    </main>
  );
};
