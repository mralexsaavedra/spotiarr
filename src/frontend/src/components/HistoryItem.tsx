import { FC, MouseEvent, useCallback } from "react";
import { formatRelativeDate } from "../utils/date";
import { Button } from "./Button";

interface HistoryItemProps {
  playlistName: string;
  playlistSpotifyUrl: string | null;
  trackCount: number;
  lastCompletedAt: number | null;
  isRecreating: boolean;
  isDisabled: boolean;
  onRecreate: (event: MouseEvent<HTMLButtonElement>, spotifyUrl: string | null) => void;
}

export const HistoryItem: FC<HistoryItemProps> = ({
  playlistName,
  playlistSpotifyUrl,
  trackCount,
  lastCompletedAt,
  isRecreating,
  isDisabled,
  onRecreate,
}) => {
  const handleRecreate = useCallback(() => {
    const fakeEvent = {} as MouseEvent<HTMLButtonElement>;
    onRecreate(fakeEvent, playlistSpotifyUrl);
  }, [onRecreate, playlistSpotifyUrl]);

  return (
    <div className="bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-all">
      <div className="mb-3">
        <h3 className="font-bold text-base text-text-primary break-words mb-1">{playlistName}</h3>
        <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
          <span>{trackCount} tracks downloaded</span>
          {lastCompletedAt && (
            <>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted">{formatRelativeDate(lastCompletedAt)}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {playlistSpotifyUrl && (
          <>
            <a
              href={playlistSpotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-primary bg-white/10 hover:bg-white/20 flex items-center gap-2 rounded-full px-3 py-1.5 transition-all font-semibold"
              title="Open in Spotify"
            >
              <i className="fa-brands fa-spotify" />
              <span>Open in Spotify</span>
            </a>
            <Button
              variant="secondary"
              size="sm"
              icon="fa-rotate"
              title={
                isDisabled ? "Playlist already exists" : "Recreate playlist and subscribe again"
              }
              onClick={handleRecreate}
              disabled={isRecreating || isDisabled}
              loading={isRecreating}
            >
              Recreate
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
