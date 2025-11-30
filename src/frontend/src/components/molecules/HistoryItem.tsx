import { FC, MouseEvent, useCallback } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { formatRelativeDate } from "../../utils/date";
import { Button } from "../atoms/Button";

interface HistoryItemProps {
  playlistName: string;
  playlistSpotifyUrl: string | null;
  trackCount: number;
  lastCompletedAt: number | null;
  isRecreating: boolean;
  isDisabled: boolean;
  activePlaylistId?: string;
  onRecreate: (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => void;
}

export const HistoryItem: FC<HistoryItemProps> = ({
  playlistName,
  playlistSpotifyUrl,
  trackCount,
  lastCompletedAt,
  isRecreating,
  isDisabled,
  activePlaylistId,
  onRecreate,
}) => {
  const handleRecreate = useCallback(() => {
    const fakeEvent = {} as MouseEvent<HTMLButtonElement>;
    onRecreate(fakeEvent, playlistSpotifyUrl);
  }, [onRecreate, playlistSpotifyUrl]);

  return (
    <div className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_150px_120px] gap-4 items-center px-4 py-3 rounded-md hover:bg-white/10 transition-colors">
      <div className="min-w-0">
        <h3 className="font-medium text-base text-text-primary truncate">
          {activePlaylistId ? (
            <Link
              to={Path.PLAYLIST_DETAIL.replace(":id", activePlaylistId)}
              className="hover:underline"
            >
              {playlistName}
            </Link>
          ) : playlistSpotifyUrl ? (
            <Link
              to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(playlistSpotifyUrl)}`}
              className="hover:underline"
            >
              {playlistName}
            </Link>
          ) : (
            playlistName
          )}
        </h3>
        <div className="md:hidden flex items-center gap-2 text-xs text-text-secondary mt-1">
          <span>{trackCount} tracks</span>
          <span>•</span>
          <span>{lastCompletedAt ? formatRelativeDate(lastCompletedAt) : "-"}</span>
        </div>
      </div>

      <div className="hidden md:block text-right text-sm text-text-secondary">{trackCount}</div>

      <div className="hidden md:block text-right text-sm text-text-secondary">
        {lastCompletedAt ? formatRelativeDate(lastCompletedAt) : "-"}
      </div>

      <div className="flex justify-end">
        {playlistSpotifyUrl && (
          <Button
            variant="ghost"
            size="sm"
            icon="fa-rotate"
            title={isDisabled ? "Playlist already exists" : "Recreate playlist and subscribe again"}
            onClick={handleRecreate}
            disabled={isRecreating || isDisabled}
            loading={isRecreating}
          >
            <span className="hidden md:inline">Recreate</span>
          </Button>
        )}
      </div>
    </div>
  );
};
