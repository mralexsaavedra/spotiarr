import { FC, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Playlist } from "../../types/playlist";
import { TrackStatus, Track } from "../../types/track";

interface PlaylistCardProps {
  playlist: Playlist;
}

export const PlaylistCard: FC<PlaylistCardProps> = ({ playlist }) => {
  const stats = useMemo(() => {
    const tracks = playlist.tracks || [];
    const completed = tracks.filter((t: Track) => t.status === TrackStatus.Completed).length;
    const downloading = tracks.filter(
      (t: Track) =>
        t.status === TrackStatus.Downloading ||
        t.status === TrackStatus.Queued ||
        t.status === TrackStatus.Searching,
    ).length;
    const errors = tracks.filter((t: Track) => t.status === TrackStatus.Error).length;
    const total = tracks.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completedCount: completed,
      downloadingCount: downloading,
      errorCount: errors,
      totalCount: total,
      progress: progressPercent,
      isDownloading: downloading > 0,
      hasErrors: errors > 0,
      isCompleted: completed === total && total > 0,
    };
  }, [playlist.tracks]);

  const {
    completedCount,
    downloadingCount,
    errorCount,
    totalCount,
    progress,
    isDownloading,
    hasErrors,
    isCompleted,
  } = stats;

  return (
    <Link
      to={`/playlist/${playlist.id}`}
      className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-all cursor-pointer"
    >
      <div className="relative aspect-square mb-4 rounded-md overflow-hidden bg-background-hover shadow-lg">
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={playlist.name || "Playlist cover"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-music text-4xl text-text-secondary" />
          </div>
        )}

        {isDownloading && (
          <div className="absolute top-2 right-2 bg-blue-500/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <i className="fa-solid fa-spinner fa-spin text-text-primary text-xs" />
            <span className="text-text-primary text-xs font-semibold">{downloadingCount}</span>
          </div>
        )}
        {hasErrors && !isDownloading && (
          <div className="absolute top-2 right-2 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <i className="fa-solid fa-circle-exclamation text-text-primary text-xs" />
            <span className="text-text-primary text-xs font-semibold">{errorCount}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3
          className="font-bold text-text-primary truncate group-hover:underline"
          title={playlist.name || "Unnamed Playlist"}
        >
          {playlist.name || "Unnamed Playlist"}
        </h3>

        {totalCount > 0 && (
          <div className="space-y-1">
            <div className="h-1 bg-text-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isCompleted ? "bg-primary" : hasErrors ? "bg-red-500" : "bg-white"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-text-secondary">
              {completedCount}/{totalCount} tracks
              {isDownloading && <span className="text-blue-400"> • Downloading...</span>}
              {hasErrors && !isDownloading && (
                <span className="text-red-400"> • {errorCount} failed</span>
              )}
            </p>
          </div>
        )}

        {playlist.subscribed && (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <i className="fa-solid fa-circle-check" />
            <span>Subscribed</span>
          </span>
        )}
      </div>
    </Link>
  );
};
