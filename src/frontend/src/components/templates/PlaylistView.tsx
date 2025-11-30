import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { FC, ReactNode, useMemo } from "react";
import { Track } from "../../types/track";
import { PlaylistTableHeader } from "../atoms/PlaylistTableHeader";
import { PlaylistHeader } from "../molecules/PlaylistHeader";
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

  const renderMetadata = useMemo(() => {
    const firstTrack = tracks[0];
    const artists =
      firstTrack?.artists || (firstTrack?.artist ? [{ name: firstTrack.artist }] : []);

    const renderArtists = () => (
      <span className="font-bold text-white">
        {artists.map((artist, i) => (
          <span key={`${artist.name}-${i}`}>
            {artist.url ? (
              <a
                href={artist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {artist.name}
              </a>
            ) : (
              artist.name
            )}
            {i < artists.length - 1 && ", "}
          </span>
        ))}
      </span>
    );

    const typeLower = type.toLowerCase();

    if (typeLower === PlaylistTypeEnum.Album && artists.length > 0) {
      return renderArtists();
    }

    if (typeLower === PlaylistTypeEnum.Track && artists.length > 0) {
      return (
        <>
          {renderArtists()}
          <span className="text-text-primary">•</span>
          {firstTrack?.albumUrl ? (
            <a
              href={firstTrack.albumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white hover:underline transition-colors"
            >
              {firstTrack?.album || "Unknown Album"}
            </a>
          ) : (
            <span className="font-medium text-white">{firstTrack?.album || "Unknown Album"}</span>
          )}
        </>
      );
    }

    return <span className="font-bold">SpotiArr</span>;
  }, [type, tracks]);

  const description = useMemo(() => {
    if (completedCount > 0) {
      return (
        <div className="mt-4 max-w-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
            <span>
              {completedCount} / {totalCount} downloaded
            </span>
            <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
              style={{
                width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      );
    }
    return originalDescription;
  }, [completedCount, totalCount, originalDescription]);

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
        description={description}
        metadata={renderMetadata}
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
        <PlaylistTableHeader />

        <PlaylistTracksList
          tracks={tracks}
          onRetryTrack={onRetryTrack}
          onDownloadTrack={onDownloadTrack}
        />
      </div>
    </div>
  );
};
