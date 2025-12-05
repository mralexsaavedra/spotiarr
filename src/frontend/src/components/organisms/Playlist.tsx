import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC, useCallback, useState } from "react";
import { PlaylistWithStats } from "../../types";
import { Track } from "../../types";
import { EmptyState } from "../molecules/EmptyState";
import { PlaylistActions } from "../molecules/PlaylistActions";
import { PlaylistDescription } from "../molecules/PlaylistDescription";
import { PlaylistHeader } from "../molecules/PlaylistHeader";
import { PlaylistMetadata } from "../molecules/PlaylistMetadata";
import { ConfirmModal } from "../organisms/ConfirmModal";
import { PlaylistTracksList } from "../organisms/PlaylistTracksList";

interface PlaylistProps {
  playlist: PlaylistWithStats;
  tracks: Track[];
  isDownloading: boolean;
  isDownloaded: boolean;
  hasFailed: boolean;
  isRetrying: boolean;
  isSaved?: boolean;
  displayTitle: string;
  completedCount: number;
  onRetryTrack: (trackId: string) => void;
  onDownloadTrack: (track: Track) => void;
  onConfirmDelete: (() => void) | undefined;
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
  isSaved = true,
  displayTitle,
  completedCount,
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

  const totalCount = tracks.length;

  return (
    <>
      <div className="flex-1 bg-background text-text-primary">
        <PlaylistHeader
          title={displayTitle}
          type={playlist.type || PlaylistTypeEnum.Playlist}
          coverUrl={playlist.coverUrl || null}
          description={
            <PlaylistDescription
              description={playlist.description}
              completedCount={completedCount}
              totalCount={totalCount}
              isDownloading={isDownloading}
            />
          }
          metadata={
            <PlaylistMetadata type={playlist.type || PlaylistTypeEnum.Playlist} tracks={tracks} />
          }
          totalCount={totalCount}
        />

        {/* Action Bar */}
        <div className="px-6 py-6 md:px-8 bg-gradient-to-b from-black/20 to-background">
          <PlaylistActions
            isSubscribed={!!playlist?.subscribed}
            hasFailed={hasFailed}
            isRetrying={isRetrying}
            isDownloading={isDownloading}
            isDownloaded={isDownloaded ?? false}
            isSaved={isSaved}
            onToggleSubscription={onToggleSubscription}
            onRetryFailed={onRetryFailed}
            onDelete={handleDelete}
            onDownload={onDownload}
            spotifyUrl={playlist?.spotifyUrl || ""}
          />
        </div>

        {/* Content */}
        <div className="px-6 pb-8 md:px-8">
          {tracks.length === 0 ? (
            <EmptyState
              icon="music"
              title="No tracks in this playlist yet"
              description="Tracks you download or sync will appear here."
              className="py-12"
            />
          ) : (
            <PlaylistTracksList
              tracks={tracks}
              onRetryTrack={onRetryTrack}
              onDownloadTrack={onDownloadTrack}
            />
          )}
        </div>
      </div>

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
