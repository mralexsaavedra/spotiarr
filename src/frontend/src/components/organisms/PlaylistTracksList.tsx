import { FC, memo, MouseEvent, useCallback } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { Track } from "../../types/track";
import { ArtistList } from "../molecules/ArtistList";
import { TrackStatusIndicator } from "../molecules/TrackStatusIndicator";

interface PlaylistTrackItemProps {
  track: Track;
  index: number;
  onRetryTrack: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

const PlaylistTrackItem: FC<PlaylistTrackItemProps> = memo(
  ({ track, index, onRetryTrack, onDownloadTrack }) => {
    const artists = track.artists || [{ name: track.artist }];

    const handleRetry = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        onRetryTrack(track.id);
      },
      [track.id, onRetryTrack],
    );

    const handleDownload = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        if (onDownloadTrack) {
          onDownloadTrack(track);
        }
      },
      [track, onDownloadTrack],
    );

    const stopPropagation = useCallback((e: MouseEvent) => {
      e.stopPropagation();
    }, []);

    return (
      <div className="group grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition-colors">
        {/* Index */}
        <div className="text-text-secondary text-sm text-center w-4 flex justify-center">
          <TrackStatusIndicator
            status={track.status}
            index={index}
            onRetry={handleRetry}
            onDownload={onDownloadTrack ? handleDownload : undefined}
          />
        </div>

        {/* Title & Artist */}
        <div className="flex flex-col min-w-0">
          <div className="text-text-primary font-medium truncate">
            {track.trackUrl ? (
              <Link
                to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.trackUrl)}`}
                className="hover:underline"
                onClick={stopPropagation}
              >
                {track.name}
              </Link>
            ) : (
              <span>{track.name}</span>
            )}
          </div>
          <ArtistList
            artists={artists}
            className="text-text-secondary text-sm truncate"
            linkClassName="hover:text-text-primary transition-colors"
            onLinkClick={stopPropagation}
          />
        </div>

        {/* Album */}
        <div className="hidden md:block text-text-secondary text-sm truncate">
          {track.albumUrl ? (
            <Link
              to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.albumUrl)}`}
              className="hover:text-text-primary hover:underline transition-colors"
              onClick={stopPropagation}
            >
              {track.album || "Unknown Album"}
            </Link>
          ) : (
            <span>{track.album || "Unknown Album"}</span>
          )}
        </div>

        {/* Duration & Actions */}
        <div className="flex items-center justify-end gap-4">
          <div className="text-text-secondary text-sm tabular-nums min-w-[40px] text-right flex items-center justify-end gap-2">
            {track.status === "completed" && (
              <i className="fa-solid fa-circle-check text-green-500 text-base" title="Downloaded" />
            )}
            {track.durationMs ? new Date(track.durationMs).toISOString().substr(14, 5) : "--:--"}
          </div>
        </div>
      </div>
    );
  },
);

interface PlaylistTracksListProps {
  tracks: Track[];
  onRetryTrack: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

export const PlaylistTracksList: FC<PlaylistTracksListProps> = ({
  tracks,
  onRetryTrack,
  onDownloadTrack,
}) => {
  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 px-4 py-2 border-b border-white/10 text-sm font-medium text-text-secondary uppercase tracking-wider mb-2 sticky top-0 bg-background z-10">
        <div className="text-center w-4">#</div>
        <div>Title</div>
        <div className="hidden md:block">Album</div>
        <div className="text-right">
          <i className="fa-regular fa-clock" />
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col">
        {tracks.map((track, index) => (
          <PlaylistTrackItem
            key={track.id}
            track={track}
            index={index + 1}
            onRetryTrack={onRetryTrack}
            onDownloadTrack={onDownloadTrack}
          />
        ))}
      </div>
    </div>
  );
};
