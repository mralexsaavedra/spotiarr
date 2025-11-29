import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { FC, ReactNode, useMemo } from "react";
import { Track } from "../../types/track";
import { PreviewError } from "../molecules/PreviewError";
import { PlaylistTracksList } from "../organisms/PlaylistTracksList";
import { PlaylistDetailSkeleton } from "../skeletons/PlaylistDetailSkeleton";

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
    return <PlaylistDetailSkeleton />;
  }

  if (error) {
    return <PreviewError error={error} onGoBack={onGoBack} />;
  }

  const imageClasses = "w-48 h-48 md:w-60 md:h-60 shadow-2xl flex-shrink-0";
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="flex-1 bg-background overflow-y-auto h-full text-text-primary">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-800/80 to-background px-6 md:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Cover Image */}
          <div className={imageClasses}>
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={displayTitle}
                className="w-full h-full object-cover shadow-lg"
              />
            ) : (
              <div className="w-full h-full bg-background-elevated flex items-center justify-center">
                <i className="fa-solid fa-music text-6xl text-text-secondary" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 space-y-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
              {typeLabel}
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-md break-words">
              {displayTitle}
            </h1>

            {description && (
              <div className="mt-4 max-w-md">
                {typeof description === "string" ? (
                  <p className="text-text-secondary text-sm font-medium line-clamp-2">
                    {description}
                  </p>
                ) : (
                  description
                )}
              </div>
            )}

            <div className="flex items-center gap-1 text-sm font-medium text-text-primary mt-2">
              {renderMetadata}
              <span className="text-text-secondary">•</span>
              <span className="text-text-secondary">{totalCount} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {actions && (
        <div className="px-6 md:px-8 py-6 bg-gradient-to-b from-black/20 to-background">
          {actions}
        </div>
      )}

      {/* Content */}
      <div className="px-6 md:px-8 pb-8">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 px-4 py-2 border-b border-white/10 text-text-secondary text-sm uppercase tracking-wider mb-4 sticky top-0 bg-background z-10">
          <div className="text-center">#</div>
          <div>Title</div>
          <div className="hidden md:block">Album</div>
          <div className="text-right">
            <i className="fa-regular fa-clock" />
          </div>
        </div>

        <PlaylistTracksList
          tracks={tracks}
          onRetryTrack={onRetryTrack}
          onDownloadTrack={onDownloadTrack}
        />
      </div>
    </div>
  );
};
