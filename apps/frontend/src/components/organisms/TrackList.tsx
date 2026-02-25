import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ITrack, TrackStatusEnum } from "@spotiarr/shared";
import { FC, memo, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { Path } from "@/routes/routes";
import { formatDuration } from "@/utils/date";
import { Image } from "../atoms/Image";
import { TrackStatusIndicator } from "../molecules/TrackStatusIndicator";
import { VirtualList } from "../molecules/VirtualList";

// Minimum shape required to render a TrackList item
export interface TrackListTrack extends ITrack {
  id?: string;
  albumCoverUrl?: string | null;
}

interface TrackListItemProps {
  track: TrackListTrack;
  index: number;
  onDownload: (track: TrackListTrack) => void;
  status?: TrackStatusEnum;
}

const TrackListItem: FC<TrackListItemProps> = memo(({ track, index, onDownload, status }) => {
  const isDownloaded = status === TrackStatusEnum.Completed;

  const handleRetry = useCallback(() => {
    onDownload(track);
  }, [track, onDownload]);

  const handleDownloadClick = useCallback(() => {
    onDownload(track);
  }, [track, onDownload]);

  return (
    <div className="group grid grid-cols-[16px_1fr_auto] items-center gap-4 rounded-md px-4 py-2 transition-colors hover:bg-white/10">
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
      <div className="flex min-w-0 items-center gap-4">
        <div className="h-10 w-10 shrink-0">
          <Image
            src={track.albumCoverUrl ?? track.albumUrl ?? undefined}
            alt={track.name}
            loading="lazy"
            className="rounded shadow-sm"
          />
        </div>
        <div className="flex min-w-0 flex-col">
          {track.trackUrl ? (
            <Link
              to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.trackUrl)}`}
              className="truncate text-base font-medium text-white hover:underline"
            >
              {track.name}
            </Link>
          ) : (
            <span className="truncate text-base font-medium text-white">{track.name}</span>
          )}
          <span className="text-text-secondary truncate text-sm">{track.artist}</span>
        </div>
      </div>

      {/* Duration */}
      <div className="text-text-secondary flex items-center justify-end gap-4 text-sm">
        {isDownloaded && (
          <FontAwesomeIcon icon={faCircleCheck} className="text-base text-green-500" />
        )}
        <span>{track.durationMs ? formatDuration(track.durationMs) : "--:--"}</span>
      </div>
    </div>
  );
});

interface TrackListProps {
  tracks: TrackListTrack[];
  onDownload: (track: TrackListTrack) => void;
}

export const TrackList: FC<TrackListProps> = ({ tracks, onDownload }) => {
  const { getBulkTrackStatus } = useDownloadStatusContext();

  const trackStatusesMap = useMemo(() => {
    const urls = tracks.map((t) => t.trackUrl);
    return getBulkTrackStatus(urls);
  }, [tracks, getBulkTrackStatus]);

  const renderItem = useCallback(
    (track: TrackListTrack, index: number) => {
      const status = track.trackUrl ? trackStatusesMap.get(track.trackUrl) : undefined;

      return (
        <TrackListItem track={track} index={index + 1} onDownload={onDownload} status={status} />
      );
    },
    [onDownload, trackStatusesMap],
  );

  return (
    <div className="flex flex-col gap-2">
      <VirtualList
        items={tracks}
        itemKey={(track) => track.trackUrl ?? track.id ?? track.name}
        renderItem={renderItem}
      />
    </div>
  );
};
