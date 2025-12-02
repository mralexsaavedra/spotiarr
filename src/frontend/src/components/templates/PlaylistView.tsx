import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, ReactNode, useMemo } from "react";
import { Track } from "../../types/track";
import { formatPlaylistTitle } from "../../utils/playlist";
import { EmptyState } from "../molecules/EmptyState";
import { PlaylistDescription } from "../molecules/PlaylistDescription";
import { PlaylistHeader } from "../molecules/PlaylistHeader";
import { PlaylistMetadata } from "../molecules/PlaylistMetadata";
import { PlaylistTracksList } from "../organisms/PlaylistTracksList";

interface PlaylistViewProps {
  title: string;
  type: string;
  coverUrl: string | null;
  description?: string | null;
  actions: ReactNode;
  tracks: Track[];
  onRetryTrack?: (id: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

export const PlaylistView: FC<PlaylistViewProps> = ({
  title: rawTitle,
  type,
  coverUrl,
  description: originalDescription,
  actions,
  tracks,
  onRetryTrack,
  onDownloadTrack,
}) => {
  const totalCount = tracks.length;
  const completedCount = tracks.filter((t) => t.status === TrackStatusEnum.Completed).length;

  const displayTitle = useMemo(
    () => formatPlaylistTitle(rawTitle, type, tracks),
    [rawTitle, type, tracks],
  );

  return (
    <div className="flex-1 bg-background text-text-primary">
      <PlaylistHeader
        title={displayTitle}
        type={type}
        coverUrl={coverUrl}
        description={
          <PlaylistDescription
            description={originalDescription}
            completedCount={completedCount}
            totalCount={totalCount}
          />
        }
        metadata={<PlaylistMetadata type={type} tracks={tracks} />}
        totalCount={totalCount}
      />

      {/* Action Bar */}
      {actions && (
        <div className="px-6 md:px-8 py-6 bg-gradient-to-b from-black/20 to-background">
          {actions}
        </div>
      )}

      {/* Content */}
      <div className="px-6 md:px-8 pb-8">
        {tracks.length === 0 ? (
          <EmptyState
            icon="fa-music"
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
  );
};
