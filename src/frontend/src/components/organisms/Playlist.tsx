import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo, useState } from "react";
import { PlaylistWithStats } from "../../types/playlist";
import { Track } from "../../types/track";
import { ConfirmModal } from "../molecules/ConfirmModal";
import { PlaylistActions } from "../molecules/PlaylistActions";
import { PlaylistTemplate } from "../templates/PlaylistTemplate";

interface PlaylistProps {
  playlist: PlaylistWithStats;
  tracks: Track[];
  isDownloading: boolean;
  isDownloaded?: boolean;
  hasFailed: boolean;
  isRetrying: boolean;
  onRetryTrack: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
  onConfirmDelete: () => void;
  onRetryFailed: () => void;
  onToggleSubscription: () => void;
  onDownload: () => void;
}

export const Playlist: FC<PlaylistProps> = ({
  playlist,
  tracks,
  isDownloading,
  isDownloaded,
  hasFailed,
  isRetrying,
  onRetryTrack,
  onDownloadTrack,
  onConfirmDelete,
  onRetryFailed,
  onToggleSubscription,
  onDownload,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleConfirmDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
    onConfirmDelete?.();
  }, [onConfirmDelete]);

  const handleDelete = useCallback(() => {
    setIsDeleteModalOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleRetryFailed = useCallback(() => {
    if (!hasFailed) {
      return;
    }

    onRetryFailed?.();
  }, [hasFailed, onRetryFailed]);

  const actions = useMemo(
    () => (
      <PlaylistActions
        isSubscribed={!!playlist?.subscribed}
        hasFailed={hasFailed}
        isRetrying={isRetrying}
        isDownloading={isDownloading}
        isDownloaded={isDownloaded ?? false}
        onToggleSubscription={onToggleSubscription}
        onRetryFailed={handleRetryFailed}
        onDelete={handleDelete}
        onDownload={onDownload}
        spotifyUrl={playlist?.spotifyUrl || ""}
      />
    ),
    [
      playlist?.subscribed,
      playlist?.spotifyUrl,
      hasFailed,
      isRetrying,
      isDownloading,
      isDownloaded,
      onToggleSubscription,
      handleRetryFailed,
      handleDelete,
      onDownload,
    ],
  );

  return (
    <>
      <PlaylistTemplate
        title={playlist.name || "Unnamed Playlist"}
        type={playlist.type || PlaylistTypeEnum.Playlist}
        coverUrl={playlist.coverUrl || null}
        description={playlist.description}
        isDownloading={isDownloading}
        actions={actions}
        tracks={tracks}
        onRetryTrack={onRetryTrack}
        onDownloadTrack={onDownloadTrack}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={`Delete ${playlist?.name}?`}
        description="This will remove the playlist from your library. Downloaded files will NOT be deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancel}
        isDestructive={true}
      />
    </>
  );
};
