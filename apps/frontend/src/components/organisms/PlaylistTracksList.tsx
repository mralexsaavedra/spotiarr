import { faClock } from "@fortawesome/free-regular-svg-icons";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useBulkTrackStatus } from "@/hooks/queries/useDownloadStatus";
import { Path } from "@/routes/routes";
import { Track } from "@/types";
import { formatDuration } from "@/utils/date";
import { isSpotifyUrl } from "@/utils/spotify";
import { ArtistLinks } from "../molecules/ArtistLinks";
import { TrackStatusIndicator } from "../molecules/TrackStatusIndicator";
import { VirtualList } from "../molecules/VirtualList";

interface PlaylistTrackItemProps {
  track: Track;
  index: number;
  status?: TrackStatusEnum;
  isPlayable: boolean;
  onRetryTrack?: (trackId: string) => void;
  onDownloadTrack?: (track: Track) => void;
  onPlayTrack?: (trackId: string) => void;
  onPauseTrack?: () => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  showDownloadedBadge?: boolean;
}

const PlaylistTrackItem: FC<PlaylistTrackItemProps> = memo(
  ({
    track,
    index,
    status,
    isPlayable,
    onRetryTrack,
    onDownloadTrack,
    onPlayTrack,
    onPauseTrack,
    currentTrackId,
    isPlaying,
    showDownloadedBadge,
  }) => {
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

    const isCurrent = currentTrackId === track.id;
    const canPlayTrack = isPlayable && Boolean(onPlayTrack);

    const handleTogglePlayback = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();

        if (!canPlayTrack || !onPlayTrack) {
          return;
        }

        if (isCurrent && isPlaying && onPauseTrack) {
          onPauseTrack();
          return;
        }

        onPlayTrack(track.id);
      },
      [canPlayTrack, isCurrent, isPlaying, onPauseTrack, onPlayTrack, track.id],
    );

    return (
      <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md px-4 py-2 transition-colors hover:bg-white/10 md:grid-cols-[16px_1fr_1fr_180px]">
        {/* Index */}
        <div className="text-text-secondary flex w-4 justify-center text-center text-sm">
          <TrackStatusIndicator
            status={status ?? track.status}
            index={index}
            onRetry={onRetryTrack ? handleRetry : undefined}
            onDownload={onDownloadTrack ? handleDownload : undefined}
            onPlay={canPlayTrack ? handleTogglePlayback : undefined}
            isCurrentTrack={isCurrent}
            isPlaying={isPlaying}
          />
        </div>

        {/* Title & Artist */}
        <div className="flex min-w-0 flex-col">
          <div className="text-text-primary truncate font-medium">
            {isSpotifyUrl(track.trackUrl) ? (
              <Link
                to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.trackUrl!)}`}
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
          {isSpotifyUrl(track.albumUrl) ? (
            <Link
              to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.albumUrl!)}`}
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
            {showDownloadedBadge && (status ?? track.status) === TrackStatusEnum.Completed && (
              <FontAwesomeIcon
                icon={faCircleCheck}
                title={t("playlist.downloaded")}
                className="text-green-500"
              />
            )}
            {track.durationMs ? formatDuration(track.durationMs) : "--:--"}
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
  onLoadMoreTracks?: () => void;
  hasMoreTracks?: boolean;
  isLoadingMoreTracks?: boolean;
  onPlayTrack?: (trackId: string) => void;
  onPauseTrack?: () => void;
  canPlayTrack?: (track: Track) => boolean;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  showDownloadedBadge?: boolean;
}

export const PlaylistTracksList: FC<PlaylistTracksListProps> = ({
  tracks,
  onRetryTrack,
  onDownloadTrack,
  onLoadMoreTracks,
  hasMoreTracks = false,
  isLoadingMoreTracks = false,
  onPlayTrack,
  onPauseTrack,
  canPlayTrack,
  currentTrackId,
  isPlaying = false,
  showDownloadedBadge = false,
}) => {
  const { t } = useTranslation();

  const trackUrls = useMemo(() => tracks.map((t) => t.trackUrl), [tracks]);

  const trackStatusesMap = useBulkTrackStatus(trackUrls);

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
          isPlayable={canPlayTrack ? canPlayTrack(track) : Boolean(track.trackUrl)}
          onRetryTrack={onRetryTrack}
          onDownloadTrack={onDownloadTrack}
          onPlayTrack={onPlayTrack}
          onPauseTrack={onPauseTrack}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          showDownloadedBadge={showDownloadedBadge}
        />
      );
    },
    [
      onRetryTrack,
      onDownloadTrack,
      onPlayTrack,
      onPauseTrack,
      canPlayTrack,
      currentTrackId,
      isPlaying,
      showDownloadedBadge,
      trackStatusesMap,
    ],
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
      <VirtualList
        items={tracks}
        itemKey={(track) => track.id}
        renderItem={renderItem}
        onEndReached={hasMoreTracks ? onLoadMoreTracks : undefined}
        footer={
          isLoadingMoreTracks ? (
            <div className="text-text-secondary py-4 text-center text-sm">
              {t("common.loading")}
            </div>
          ) : undefined
        }
      />
    </div>
  );
};
