import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, memo } from "react";
import type { Playlist } from "../../types/playlist";
import { PlaylistStats } from "../../types/playlist";

interface PlaylistCardProps {
  playlist: Playlist;
  stats: PlaylistStats;
  onClick: (id: string) => void;
}

export const PlaylistCard: FC<PlaylistCardProps> = memo(
  ({
    playlist,
    stats: { completedCount, errorCount, totalCount, isDownloading, hasErrors, isCompleted },
    onClick,
  }) => {
    return (
      <div
        onClick={() => onClick(playlist.id)}
        className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-colors duration-300 cursor-pointer block"
      >
        <div className="relative aspect-square mb-4 rounded-md overflow-hidden shadow-lg bg-background-hover">
          {playlist.subscribed && (
            <div
              className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-8 h-8 flex items-center justify-center backdrop-blur-sm shadow-md"
              title="Subscribed"
            >
              <FontAwesomeIcon icon={["fas", "bell"]} className="text-green-500 text-sm" />
            </div>
          )}
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.name || "Playlist cover"}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FontAwesomeIcon icon="music" className="text-4xl text-text-secondary" />
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
                <FontAwesomeIcon icon="spinner" spin className="text-blue-400 text-xs" />
                <span>
                  <span className="hidden sm:inline">Downloading... </span>
                  {completedCount}/{totalCount}
                </span>
              </>
            ) : hasErrors ? (
              <>
                <FontAwesomeIcon icon="circle-exclamation" className="text-red-400 text-xs" />
                <span>{errorCount} failed</span>
              </>
            ) : isCompleted ? (
              <>
                <FontAwesomeIcon icon="circle-arrow-down" className="text-primary text-xs" />
                <span>{totalCount} tracks</span>
              </>
            ) : (
              <span>{totalCount} tracks</span>
            )}
          </div>
        </div>
      </div>
    );
  },
);
