import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { FC, ReactNode, useMemo } from "react";
import { Track } from "../../types/track";
import { PlaylistTableHeader } from "../atoms/PlaylistTableHeader";
import { EmptyState } from "../molecules/EmptyState";
import { PlaylistDescription } from "../molecules/PlaylistDescription";
import { PlaylistHeader } from "../molecules/PlaylistHeader";
import { PlaylistMetadata } from "../molecules/PlaylistMetadata";
import { PreviewError } from "../molecules/PreviewError";
import { PlaylistTracksList } from "../organisms/PlaylistTracksList";
import { PlaylistSkeleton } from "../skeletons/PlaylistSkeleton";

interface PlaylistViewProps {
  title: string;
  type: string;
  coverUrl: string | null;
  description?: string | null;
  actions: ReactNode;
  tracks: Track[];
  isLoading: boolean;
  error: unknown;
  onGoBack: () => void;
  onRetryTrack: (id: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

export const PlaylistView: FC<PlaylistViewProps> = ({
  title: rawTitle,
  type,
  coverUrl,
  description: originalDescription,
  actions,
  tracks,
  isLoading,
  error,
  onGoBack,
  onRetryTrack,
  onDownloadTrack,
}) => {
  const totalCount = tracks.length;
  const completedCount = tracks.filter((t) => t.status === TrackStatusEnum.Completed).length;

  const displayTitle = useMemo(() => {
    if (!rawTitle) return "Unnamed Playlist";

    // Normalize type for comparison (backend sends lowercase, enum is PascalCase-ish values but let's check)
    // PlaylistTypeEnum: Playlist="playlist", Album="album", Track="track"
    const typeLower = type.toLowerCase();

    if (typeLower === PlaylistTypeEnum.Album) {
      if (tracks.length > 0 && tracks[0].album) {
        return tracks[0].album;
      }
      const parts = rawTitle.split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : rawTitle;
    }

    if (typeLower === PlaylistTypeEnum.Track) {
      if (tracks.length > 0 && tracks[0].name) {
        return tracks[0].name;
      }
      const parts = rawTitle.split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : rawTitle;
    }

    return rawTitle;
  }, [rawTitle, type, tracks]);

  if (isLoading) {
    return <PlaylistSkeleton />;
  }

  if (error) {
    return <PreviewError error={error} onGoBack={onGoBack} />;
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto h-full text-text-primary">
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
          <>
            <PlaylistTableHeader />

            <PlaylistTracksList
              tracks={tracks}
              onRetryTrack={onRetryTrack}
              onDownloadTrack={onDownloadTrack}
            />
          </>
        )}
      </div>
    </div>
  );
};
