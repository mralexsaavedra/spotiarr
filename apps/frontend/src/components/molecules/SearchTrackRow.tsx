import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NormalizedTrack, TrackStatusEnum } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { formatDuration } from "@/utils/date";
import { Image } from "../atoms/Image";
import { TrackStatusIndicator } from "./TrackStatusIndicator";

interface SearchTrackRowProps {
  track: NormalizedTrack;
  index: number;
  status?: TrackStatusEnum;
  onPreview: (track: NormalizedTrack) => void;
  onDownload: (track: NormalizedTrack) => void;
}

export const SearchTrackRow: FC<SearchTrackRowProps> = ({
  track,
  index,
  status,
  onPreview,
  onDownload,
}) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onPreview(track)}
      className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5"
    >
      <div className="flex w-5 shrink-0 justify-center text-sm font-medium text-zinc-500">
        <TrackStatusIndicator
          status={status}
          index={index + 1}
          onDownload={(e) => {
            e.stopPropagation();
            onDownload(track);
          }}
        />
      </div>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-800">
        <Image src={track.albumCoverUrl ?? undefined} alt={track.name} fallbackIcon="music" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{track.name}</p>
        <p className="truncate text-xs text-zinc-400">{track.artist}</p>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 text-sm text-zinc-500 tabular-nums">
        {status === TrackStatusEnum.Completed && (
          <FontAwesomeIcon
            icon={faCircleCheck}
            className="text-base text-green-500"
            title={t("common.downloaded")}
          />
        )}
        {track.durationMs ? formatDuration(track.durationMs) : ""}
      </div>
    </div>
  );
};
