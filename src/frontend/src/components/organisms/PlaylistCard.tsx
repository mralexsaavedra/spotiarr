import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQueryClient } from "@tanstack/react-query";
import { FC, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import type { Playlist } from "../../types/playlist";
import { PlaylistStats } from "../../types/playlist";

interface PlaylistCardProps {
  playlist: Playlist;
  stats: PlaylistStats;
}

export const PlaylistCard: FC<PlaylistCardProps> = memo(
  ({
    playlist,
    stats: { completedCount, errorCount, totalCount, isDownloading, hasErrors, isCompleted },
  }) => {
    const queryClient = useQueryClient();

    const handleMouseEnter = useCallback(() => {
      // Prefetch tracks when user hovers over the card
      queryClient.prefetchQuery({
        queryKey: ["tracks", playlist.id],
        queryFn: () => api.getTracksByPlaylist(playlist.id),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }, [queryClient, playlist.id]);

    return (
      <Link
        to={`/playlist/${playlist.id}`}
        onMouseEnter={handleMouseEnter}
        className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-colors duration-300 cursor-pointer block"
      >
        <div className="relative aspect-square mb-4 rounded-md overflow-hidden shadow-lg bg-background-hover">
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
                  Downloading... {completedCount}/{totalCount}
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
  },
);
