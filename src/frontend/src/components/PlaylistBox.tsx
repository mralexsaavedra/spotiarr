import { useCallback, useMemo } from "react";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useTracks } from "@/hooks/useTracks";
import { TrackStatus } from "@/types/track";
import { useUIStore } from "@/store/useUIStore";
import type { Playlist } from "@/types/playlist";
import clsx from "clsx";
import { TrackList } from "./TrackList";

interface Props {
  playlist: Playlist;
}

export const PlaylistBox = ({ playlist }: Props) => {
  const { updatePlaylist, deletePlaylist, retryFailedTracks } = usePlaylists();
  const { tracks } = useTracks(playlist.id);
  const { collapsedPlaylists, togglePlaylistCollapse } = useUIStore();

  const isCollapsed = collapsedPlaylists.has(playlist.id);

  const completedCount = useMemo(
    () =>
      tracks.filter((t) => t.status === TrackStatus.Completed).length,
    [tracks],
  );
  const totalCount = useMemo(() => tracks.length, [tracks]);
  const failedTracks = useMemo(
    () => tracks.filter((t) => t.status === TrackStatus.Error),
    [tracks],
  );

  const handleToggleCollapse = useCallback(() => {
    togglePlaylistCollapse(playlist.id);
  }, [playlist.id, togglePlaylistCollapse]);

  const handleToggleActive = useCallback(() => {
    updatePlaylist.mutate({
      id: playlist.id,
      data: { active: !playlist.active },
    });
  }, [playlist.active, playlist.id, updatePlaylist]);

  const handleDelete = useCallback(() => {
    if (!Number.isFinite(playlist.id)) {
      console.warn("Attempted delete playlist with invalid id", playlist.id);
      return;
    }
    deletePlaylist.mutate(playlist.id);
  }, [deletePlaylist, playlist.id]);

  const handleRetryFailed = useCallback(() => {
    if (!failedTracks.length || !Number.isFinite(playlist.id)) {
      return;
    }
    retryFailedTracks.mutate(playlist.id);
  }, [failedTracks.length, playlist.id, retryFailedTracks]);

  const statusClass = useMemo(() => {
    if (playlist.error) return "border-red-500";
    if (playlist.active) return "border-spotify-green";
    if (completedCount === totalCount && totalCount > 0)
      return "border-green-500";
    return "";
  }, [completedCount, playlist.active, playlist.error, totalCount]);

  return (
    <article
      className={clsx(
        "mb-6 rounded-2xl shadow-lg border border-spotify-gray-light dark:border-spotify-gray-dark bg-white dark:bg-spotify-black hover:border-spotify-green transition-all",
        statusClass
      )}
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-spotify-gray-light dark:border-spotify-gray-dark">
        <div className="flex items-center gap-4">
          <i
            className={clsx(
              "cursor-pointer fa-solid text-spotify-green text-xl hover:scale-110 transition-transform",
              isCollapsed ? "fa-caret-down" : "fa-caret-right"
            )}
            onClick={handleToggleCollapse}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-black dark:text-white">
                {playlist.name || "Unnamed Playlist"}
              </span>
              <a
                href={playlist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-spotify-green hover:text-spotify-green-light hover:scale-110 transition-all"
                title="Open in Spotify"
              >
                <i className="fa-brands fa-spotify text-lg" />
              </a>
              {playlist.error && (
                <span className="ml-2 text-sm font-semibold text-red-500 dark:text-red-400">
                  {playlist.error}
                </span>
              )}
            </div>
            <span className="text-xs text-spotify-gray-dark dark:text-spotify-gray-light">
              {completedCount}/{totalCount} tracks
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <i
            className={clsx(
              "fa-solid cursor-pointer text-2xl hover:text-spotify-green hover:scale-110 transition-all",
              playlist.active ? "fa-toggle-on text-spotify-green" : "fa-toggle-off"
            )}
            title={playlist.active ? "[ON]: Unsubscribe from playlist changes?" : "[OFF]: Subscribe to playlist changes?"}
            onClick={handleToggleActive}
          />
          <i
            className={clsx(
              "fa-solid fa-repeat text-xl transition-all",
              failedTracks.length ? "cursor-pointer hover:text-spotify-green hover:scale-110" : "cursor-not-allowed text-spotify-gray-light/60",
              retryFailedTracks.isPending && "animate-pulse text-spotify-green"
            )}
            title={failedTracks.length ? "Reintentar descargas fallidas" : "No hay descargas fallidas que reintentar"}
            onClick={failedTracks.length ? handleRetryFailed : undefined}
          />
          <i
            className="fa-solid fa-xmark text-xl cursor-pointer hover:text-red-500 hover:scale-110 transition-all"
            title="Remove playlist from list"
            onClick={() => playlist.id != null && handleDelete()}
          />
        </div>
      </div>
      {/* Lista de tracks tipo Spotify */}
      {isCollapsed && (
        <div className="bg-spotify-gray-light dark:bg-spotify-gray-dark px-6 py-4">
          <TrackList playlistId={playlist.id} />
        </div>
      )}
    </article>
  );
};
