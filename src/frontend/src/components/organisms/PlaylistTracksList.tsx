import { faClock } from "@fortawesome/free-regular-svg-icons";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { Path } from "@/routes/routes";
import { Track } from "@/types";
import { ArtistLinks } from "../molecules/ArtistLinks";
import { TrackStatusIndicator } from "../molecules/TrackStatusIndicator";
import { VirtualList } from "../molecules/VirtualList";

interface PlaylistTrackItemProps {
  track: Track;
  index: number;
  status?: TrackStatusEnum;
  onRetryTrack?: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

const PlaylistTrackItem: FC<PlaylistTrackItemProps> = memo(
  ({ track, index, status, onRetryTrack, onDownloadTrack }) => {
    const { t } = useTranslation();
    const artists = track.artists || [{ name: track.artist }];

    const handleRetry = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        if (onRetryTrack) {
          onRetryTrack(track.id);
        }
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
      <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md px-4 py-2 transition-colors hover:bg-white/10 md:grid-cols-[16px_1fr_1fr_180px]">
        {/* Index */}
        <div className="text-text-secondary flex w-4 justify-center text-center text-sm">
          <TrackStatusIndicator
            status={status ?? track.status}
            index={index}
            onRetry={onRetryTrack ? handleRetry : undefined}
            onDownload={onDownloadTrack ? handleDownload : undefined}
          />
        </div>

        {/* Title & Artist */}
        <div className="flex min-w-0 flex-col">
          <div className="text-text-primary truncate font-medium">
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
          <ArtistLinks
            artists={artists}
            className="text-text-secondary truncate text-sm"
            linkClassName="hover:text-text-primary transition-colors"
            onLinkClick={stopPropagation}
          />
        </div>

        {/* Album */}
        <div className="text-text-secondary hidden truncate text-sm md:block">
          {track.albumUrl ? (
            <Link
              to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.albumUrl)}`}
              className="hover:text-text-primary transition-colors hover:underline"
              onClick={stopPropagation}
            >
              {track.album || t("playlist.unknownAlbum")}
            </Link>
          ) : (
            <span>{track.album || t("playlist.unknownAlbum")}</span>
          )}
        </div>

        {/* Duration & Actions */}
        <div className="flex items-center justify-end gap-4">
          <div className="text-text-secondary flex min-w-[40px] items-center justify-end gap-2 text-right text-sm tabular-nums">
            {(status ?? track.status) === "completed" && (
              <FontAwesomeIcon
                icon={faCircleCheck}
                className="text-base text-green-500"
                title={t("common.downloaded")}
              />
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
  onRetryTrack?: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
}

export const PlaylistTracksList: FC<PlaylistTracksListProps> = ({
  tracks,
  onRetryTrack,
  onDownloadTrack,
}) => {
  const { t } = useTranslation();
  const { getBulkTrackStatus } = useDownloadStatusContext();

  const trackStatusesMap = useMemo(() => {
    const urls = tracks.map((t) => t.trackUrl);
    return getBulkTrackStatus(urls);
  }, [tracks, getBulkTrackStatus]);

  const renderItem = useCallback(
    (track: Track, index: number) => {
      const status = track.trackUrl
        ? (trackStatusesMap.get(track.trackUrl) ?? track.status)
        : track.status;

      return (
        <PlaylistTrackItem
          track={track}
          index={index + 1}
          status={status}
          onRetryTrack={onRetryTrack}
          onDownloadTrack={onDownloadTrack}
        />
      );
    },
    [onRetryTrack, onDownloadTrack, trackStatusesMap],
  );

  return (
    <div className="flex flex-col pb-4">
      {/* Header */}
      <div className="text-text-secondary bg-background sticky top-0 z-10 mb-2 grid grid-cols-[auto_1fr_auto] gap-4 border-b border-white/10 px-4 py-2 text-sm font-medium tracking-wider uppercase md:grid-cols-[16px_1fr_1fr_180px]">
        <div className="w-4 text-center">#</div>
        <div>{t("common.title")}</div>
        <div className="hidden md:block">{t("common.album")}</div>
        <div className="text-right">
          <FontAwesomeIcon icon={faClock} title={t("common.duration")} />
        </div>
      </div>

      {/* List */}
      <VirtualList items={tracks} itemKey={(track) => track.id} renderItem={renderItem} />
    </div>
  );
};
