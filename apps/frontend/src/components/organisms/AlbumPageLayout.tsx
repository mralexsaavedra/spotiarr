import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC, ReactNode } from "react";
import { Track } from "@/types";
import { EmptyState } from "../molecules/EmptyState";
import { PlaylistHeader } from "../molecules/PlaylistHeader";
import { PlaylistTracksList } from "./PlaylistTracksList";

export interface AlbumPageLayoutProps {
  title: string;
  type: PlaylistTypeEnum;
  coverUrl?: string | null;
  description?: ReactNode;
  metadata?: ReactNode;
  totalCount: number;
  tracks: Track[];
  actions?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onRetryTrack?: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
  hasMoreTracks?: boolean;
  isLoadingMoreTracks?: boolean;
  onLoadMoreTracks?: () => void;
  onPlayTrack?: (trackId: string) => void;
  onPauseTrack?: () => void;
  canPlayTrack?: (track: Track) => boolean;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  showDownloadedBadge?: boolean;
}

export const AlbumPageLayout: FC<AlbumPageLayoutProps> = ({
  title,
  type,
  coverUrl,
  description,
  metadata,
  totalCount,
  tracks,
  actions,
  emptyTitle,
  emptyDescription,
  onRetryTrack,
  onDownloadTrack,
  hasMoreTracks = false,
  isLoadingMoreTracks = false,
  onLoadMoreTracks,
  onPlayTrack,
  onPauseTrack,
  canPlayTrack,
  currentTrackId,
  isPlaying = false,
  showDownloadedBadge = false,
}) => {
  return (
    <div className="bg-background text-text-primary flex-1">
      <PlaylistHeader
        title={title}
        type={type || PlaylistTypeEnum.Playlist}
        coverUrl={coverUrl || null}
        description={description}
        metadata={metadata}
        totalCount={totalCount}
      />

      {actions}

      <div className="px-6 pb-8 md:px-8">
        {tracks.length === 0 ? (
          <EmptyState
            icon={faMusic}
            title={emptyTitle}
            description={emptyDescription}
            className="py-12"
          />
        ) : (
          <PlaylistTracksList
            tracks={tracks}
            onRetryTrack={onRetryTrack}
            onDownloadTrack={onDownloadTrack}
            onLoadMoreTracks={onLoadMoreTracks}
            hasMoreTracks={hasMoreTracks}
            isLoadingMoreTracks={isLoadingMoreTracks}
            onPlayTrack={onPlayTrack}
            onPauseTrack={onPauseTrack}
            canPlayTrack={canPlayTrack}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            showDownloadedBadge={showDownloadedBadge}
          />
        )}
      </div>
    </div>
  );
};
