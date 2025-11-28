import { FC, memo, useCallback } from "react";
import { Track } from "../../types/track";
import { EmptyPlaylistTracks } from "../molecules/EmptyPlaylistTracks";

interface PlaylistTracksListProps {
  tracks: Track[];
  onRetryTrack: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

interface PlaylistTrackItemProps {
  track: Track;
  index: number;
  onRetryTrack: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

const PlaylistTrackItem = memo(
  ({ track, index, onRetryTrack, onDownloadTrack }: PlaylistTrackItemProps) => {
    const artists = track.artists || [{ name: track.artist }];

    const handleRetry = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRetryTrack(track.id);
      },
      [track.id, onRetryTrack],
    );

    const handleDownload = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDownloadTrack) {
          onDownloadTrack(track);
        }
      },
      [track, onDownloadTrack],
    );

    const stopPropagation = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    return (
      <div className="group grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition-colors">
        {/* Index */}
        <div className="text-text-secondary text-sm text-center w-4 flex justify-center">
          {track.status === "error" ? (
            <button
              className="text-red-500 hover:text-red-400 transition-colors"
              onClick={handleRetry}
              title="Retry download"
            >
              <i className="fa-solid fa-rotate-right" />
            </button>
          ) : track.status === "downloading" ? (
            <i className="fa-solid fa-spinner fa-spin text-primary" title="Downloading..." />
          ) : track.status === "queued" ? (
            <i className="fa-regular fa-clock text-text-secondary" title="Queued" />
          ) : track.status === "searching" ? (
            <i className="fa-solid fa-magnifying-glass text-text-secondary" title="Searching..." />
          ) : (
            <>
              <span className={onDownloadTrack ? "group-hover:hidden" : ""}>{index + 1}</span>
              {onDownloadTrack && (
                <button
                  className="hidden group-hover:block text-text-secondary hover:text-white transition-colors"
                  onClick={handleDownload}
                  title="Download Track"
                >
                  <i className="fa-solid fa-download" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col min-w-0">
          <div className="text-text-primary font-medium truncate">
            {track.trackUrl ? (
              <a
                href={track.trackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                onClick={stopPropagation}
              >
                {track.name}
              </a>
            ) : (
              <span>{track.name}</span>
            )}
          </div>
          <div className="text-text-secondary text-sm truncate">
            {artists.map((artist, i) => (
              <span key={`${artist.name}-${i}`}>
                {artist.url ? (
                  <a
                    href={artist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-text-primary transition-colors"
                    onClick={stopPropagation}
                  >
                    {artist.name}
                  </a>
                ) : (
                  <span>{artist.name}</span>
                )}
                {i < artists.length - 1 && <span>, </span>}
              </span>
            ))}
          </div>
        </div>

        {/* Album */}
        <div className="hidden md:block text-text-secondary text-sm truncate">
          {track.albumUrl ? (
            <a
              href={track.albumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary hover:underline transition-colors"
              onClick={stopPropagation}
            >
              {track.album || "Unknown Album"}
            </a>
          ) : (
            <span>{track.album || "Unknown Album"}</span>
          )}
        </div>

        {/* Duration & Actions */}
        <div className="flex items-center justify-end gap-4">
          <div className="text-text-secondary text-sm tabular-nums min-w-[40px] text-right">
            {track.durationMs ? new Date(track.durationMs).toISOString().substr(14, 5) : "--:--"}
          </div>
        </div>
      </div>
    );
  },
);

export const PlaylistTracksList: FC<PlaylistTracksListProps> = ({
  tracks,
  onRetryTrack,
  onDownloadTrack,
}) => {
  if (tracks.length === 0) {
    return <EmptyPlaylistTracks />;
  }

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => (
        <PlaylistTrackItem
          key={track.id}
          track={track}
          index={index}
          onRetryTrack={onRetryTrack}
          onDownloadTrack={onDownloadTrack}
        />
      ))}
    </div>
  );
};
