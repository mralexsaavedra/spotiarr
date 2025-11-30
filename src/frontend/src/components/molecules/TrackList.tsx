import { ArtistTopTrack, TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { formatDuration } from "../../utils/date";
import { EmptyState } from "./EmptyState";
import { TrackStatusIndicator } from "./TrackStatusIndicator";

interface TrackListProps {
  tracks: ArtistTopTrack[];
  onDownload: (url: string) => void;
  getTrackStatus: (url: string) => string | undefined;
}

export const TrackList: FC<TrackListProps> = ({ tracks, onDownload, getTrackStatus }) => {
  const handleDownload = useCallback(
    (url: string) => {
      onDownload(url);
    },
    [onDownload],
  );

  if (!tracks.length) {
    return (
      <EmptyState
        icon="fa-music"
        title="No tracks found"
        description="This artist has no popular tracks available."
        className="py-8"
      />
    );
  }

  return (
    <div className="flex flex-col">
      {tracks.map((track, index) => {
        const status = (track.trackUrl ? getTrackStatus(track.trackUrl) : undefined) as
          | TrackStatusEnum
          | undefined;
        const isDownloaded = status === TrackStatusEnum.Completed;

        return (
          <div
            key={`${track.trackUrl ?? track.name}-${index}`}
            className="group grid grid-cols-[16px_1fr_auto] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
          >
            {/* Index / Status Icon */}
            <div className="flex justify-center">
              <TrackStatusIndicator
                status={status}
                index={index}
                onRetry={() => track.trackUrl && handleDownload(track.trackUrl)}
                onDownload={
                  track.trackUrl && !isDownloaded
                    ? () => handleDownload(track.trackUrl!)
                    : undefined
                }
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
                <a
                  href={track.trackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium truncate hover:underline text-white"
                >
                  {track.name}
                </a>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-end gap-4 text-sm text-zinc-400">
              {isDownloaded && <i className="fa-solid fa-circle-check text-green-500 text-base" />}
              <span>{track.durationMs ? formatDuration(track.durationMs) : "--:--"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
