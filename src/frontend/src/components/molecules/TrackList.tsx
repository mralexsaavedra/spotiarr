import { ArtistTopTrack, TrackStatusEnum } from "@spotiarr/shared";
import { FC, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { formatDuration } from "../../utils/date";
import { TrackStatusIndicator } from "./TrackStatusIndicator";

interface TrackListItemProps {
  track: ArtistTopTrack;
  index: number;
  onDownload: (url: string) => void;
  getTrackStatus: (url: string) => string | undefined;
}

const TrackListItem: FC<TrackListItemProps> = memo(
  ({ track, index, onDownload, getTrackStatus }) => {
    const status = (track.trackUrl ? getTrackStatus(track.trackUrl) : undefined) as
      | TrackStatusEnum
      | undefined;
    const isDownloaded = status === TrackStatusEnum.Completed;

    const handleRetry = useCallback(() => {
      if (track.trackUrl) {
        onDownload(track.trackUrl);
      }
    }, [track.trackUrl, onDownload]);

    const handleDownloadClick = useCallback(() => {
      if (track.trackUrl) {
        onDownload(track.trackUrl);
      }
    }, [track.trackUrl, onDownload]);

    return (
      <div className="group grid grid-cols-[16px_1fr_auto] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition-colors">
        {/* Index / Status Icon */}
        <div className="flex justify-center">
          <TrackStatusIndicator
            status={status}
            index={index}
            onRetry={handleRetry}
            onDownload={track.trackUrl && !isDownloaded ? handleDownloadClick : undefined}
          />
        </div>

        {/* Title & Image */}
        <div className="flex items-center gap-4 min-w-0">
          {track.albumCoverUrl && (
            <img
              src={track.albumCoverUrl}
              alt={track.name}
              className="w-10 h-10 rounded shadow-sm object-cover"
            />
          )}
          <div className="flex flex-col min-w-0">
            {track.trackUrl ? (
              <Link
                to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.trackUrl)}`}
                className="text-base font-medium truncate hover:underline text-white"
              >
                {track.name}
              </Link>
            ) : (
              <span className="text-base font-medium truncate text-white">{track.name}</span>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-end gap-4 text-sm text-text-secondary">
          {isDownloaded && <i className="fa-solid fa-circle-check text-green-500 text-base" />}
          <span>{track.durationMs ? formatDuration(track.durationMs) : "--:--"}</span>
        </div>
      </div>
    );
  },
);

interface TrackListProps {
  tracks: ArtistTopTrack[];
  onDownload: (url: string) => void;
  getTrackStatus: (url: string) => string | undefined;
}

export const TrackList: FC<TrackListProps> = ({ tracks, onDownload, getTrackStatus }) => {
  return (
    <div className="flex flex-col">
      {tracks.map((track, index) => (
        <TrackListItem
          key={`${track.trackUrl ?? track.name}-${index}`}
          track={track}
          index={index}
          onDownload={onDownload}
          getTrackStatus={getTrackStatus}
        />
      ))}
    </div>
  );
};
