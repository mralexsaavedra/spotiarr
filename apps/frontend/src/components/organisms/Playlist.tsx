import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlaylistWithStats } from "@/types";
import { Track } from "@/types";
import { AlbumPageLayout } from "../molecules/AlbumPageLayout";
import { PlaylistActions } from "../molecules/PlaylistActions";
import { PlaylistDescription } from "../molecules/PlaylistDescription";
import { PlaylistMetadata } from "../molecules/PlaylistMetadata";
import { ConfirmModal } from "../organisms/ConfirmModal";

export type PlaylistMode = "library" | "managed";

interface PlaylistProps {
  playlist: PlaylistWithStats;
  tracks: Track[];
  totalCount?: number;
  isDownloading: boolean;
  isDownloaded: boolean;
  hasFailed: boolean;
  isRetrying: boolean;
  isSaved?: boolean;
  displayTitle: string;
  completedCount: number;
  hasMoreTracks?: boolean;
  isLoadingMoreTracks?: boolean;
  onRetryTrack?: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
  onLoadMoreTracks?: () => void;
  onPlayTrack?: (trackId: string) => void;
  onPauseTrack?: () => void;
  onPlayPlaylist?: () => void;
  onPausePlaylist?: () => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  hasPlayableTracks?: boolean;
  onConfirmDelete: (() => void) | undefined;
  onRetryFailed: () => void;
  onToggleSubscription: () => void;
  onDownloadOrRetry: () => void;
  mode?: PlaylistMode;
}

export const Playlist: FC<PlaylistProps> = ({
  playlist,
  tracks,
  totalCount,
  isDownloading,
  isDownloaded,
  hasFailed,
  isRetrying,
  isSaved = true,
  displayTitle,
  completedCount,
  hasMoreTracks = false,
  isLoadingMoreTracks = false,
  onRetryTrack,
  onDownloadTrack,
  onLoadMoreTracks,
  onPlayTrack,
  onPauseTrack,
  onPlayPlaylist,
  onPausePlaylist,
  currentTrackId = null,
  isPlaying = false,
  hasPlayableTracks = false,
  onConfirmDelete,
  onRetryFailed,
  onToggleSubscription,
  onDownloadOrRetry,
  mode = "managed",
}) => {
  const { t } = useTranslation();
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

  const resolvedTotalCount = totalCount ?? tracks.length;

  return (
    <>
      <AlbumPageLayout
        title={displayTitle}
        type={playlist.type || PlaylistTypeEnum.Playlist}
        coverUrl={playlist.coverUrl || null}
        description={
          <PlaylistDescription
            description={playlist.description}
            completedCount={completedCount}
            totalCount={resolvedTotalCount}
            isDownloading={isDownloading}
            mode={mode}
          />
        }
        metadata={
          <PlaylistMetadata
            type={playlist.type || PlaylistTypeEnum.Playlist}
            tracks={tracks}
            owner={playlist.owner}
            ownerUrl={playlist.ownerUrl}
          />
        }
        totalCount={resolvedTotalCount}
        tracks={tracks}
        actions={
          <div className="to-background bg-gradient-to-b from-black/20 px-6 py-6 md:px-8">
            <PlaylistActions
              isSubscribed={!!playlist?.subscribed}
              hasFailed={hasFailed}
              isRetrying={isRetrying}
              isDownloading={isDownloading}
              isDownloaded={isDownloaded ?? false}
              isSaved={isSaved}
              hasPlayableTracks={hasPlayableTracks}
              isPlaying={isPlaying}
              onPlayPlaylist={onPlayPlaylist}
              onPausePlaylist={onPausePlaylist}
              onToggleSubscription={onToggleSubscription}
              onRetryFailed={onRetryFailed}
              onDelete={handleDelete}
              onDownload={onDownloadOrRetry}
              spotifyUrl={
                playlist?.spotifyUrl && !playlist.spotifyUrl.startsWith("spotiarr://")
                  ? playlist.spotifyUrl
                  : undefined
              }
              playlistId={playlist?.id}
              playlistName={playlist?.name}
              mode={mode}
            />
          </div>
        }
        emptyTitle={t("playlist.emptyTracksTitle")}
        emptyDescription={t("playlist.emptyTracksDescription")}
        onRetryTrack={onRetryTrack}
        onDownloadTrack={onDownloadTrack}
        onLoadMoreTracks={onLoadMoreTracks}
        hasMoreTracks={hasMoreTracks}
        isLoadingMoreTracks={isLoadingMoreTracks}
        onPlayTrack={onPlayTrack}
        onPauseTrack={onPauseTrack}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
        currentTrackId={currentTrackId}
        isPlaying={isPlaying}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title={t("playlist.deleteModal.title", { name: playlist?.name })}
        description={t("playlist.deleteModal.description")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancel}
        isDestructive={true}
      />
    </>
  );
};
