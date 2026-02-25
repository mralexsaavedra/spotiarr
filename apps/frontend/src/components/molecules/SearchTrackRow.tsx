import { NormalizedTrack } from "@spotiarr/shared";
import { FC } from "react";
import { formatDuration } from "@/utils/date";
import { Image } from "../atoms/Image";

interface SearchTrackRowProps {
  track: NormalizedTrack;
  index: number;
  onDownload: (track: NormalizedTrack) => void;
}

export const SearchTrackRow: FC<SearchTrackRowProps> = ({ track, index, onDownload }) => (
  <div
    onClick={() => onDownload(track)}
    className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5"
  >
    <span className="w-5 shrink-0 text-right text-sm text-zinc-500 group-hover:hidden">
      {index + 1}
    </span>
    <span className="hidden w-5 shrink-0 group-hover:block">
      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-800">
      <Image src={track.albumCoverUrl ?? undefined} alt={track.name} fallbackIcon="music" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-white">{track.name}</p>
      <p className="truncate text-xs text-zinc-400">{track.artist}</p>
    </div>
    <span className="shrink-0 text-sm text-zinc-500">
      {track.durationMs ? formatDuration(track.durationMs) : ""}
    </span>
  </div>
);
