import { FC } from "react";
import { Link } from "react-router-dom";
import { PlaylistStats } from "../../hooks/usePlaylistStats";
import type { Playlist } from "../../types/playlist";

interface PlaylistCardProps {
  playlist: Playlist;
  stats: PlaylistStats;
}

export const PlaylistCard: FC<PlaylistCardProps> = ({
  playlist,
  stats: { completedCount, errorCount, totalCount, isDownloading, hasErrors, isCompleted },
}) => {
  return (
    <Link
      to={`/playlist/${playlist.id}`}
      className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-colors duration-300 cursor-pointer block"
    >
      <div className="relative aspect-square mb-4 rounded-md overflow-hidden shadow-lg bg-background-hover">
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
      </div>

      <div className="flex flex-col gap-1">
        <h3
          className="font-bold text-white text-base truncate"
          title={playlist.name || "Unnamed Playlist"}
        >
          {playlist.name || "Unnamed Playlist"}
        </h3>

        <div className="text-sm text-text-subtle flex items-center gap-2 truncate min-h-[20px]">
          {isDownloading ? (
            <>
              <i className="fa-solid fa-spinner fa-spin text-blue-400 text-xs" />
              <span>
                Downloading... {completedCount}/{totalCount}
              </span>
            </>
          ) : hasErrors ? (
            <>
              <i className="fa-solid fa-circle-exclamation text-red-400 text-xs" />
              <span>{errorCount} failed</span>
            </>
          ) : isCompleted ? (
            <>
              <i className="fa-solid fa-circle-arrow-down text-primary text-xs" />
              <span>{totalCount} tracks</span>
            </>
          ) : (
            <span>{totalCount} tracks</span>
          )}

          {playlist.subscribed && !isDownloading && !hasErrors && !isCompleted && (
            <>
              <span>•</span>
              <span className="text-primary text-xs">Subscribed</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};
