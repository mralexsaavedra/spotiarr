import { ArtistTopTrack } from "@spotiarr/shared";
import { FC, MouseEvent, useCallback } from "react";
import { formatDuration } from "../../utils/date";

interface TrackListProps {
  tracks: ArtistTopTrack[];
  onDownload: (url: string) => void;
  isTrackDownloaded: (url: string) => boolean;
}

export const TrackList: FC<TrackListProps> = ({ tracks, onDownload, isTrackDownloaded }) => {
  const handleDownloadClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const url = event.currentTarget.dataset.url;
      if (url) {
        onDownload(url);
      }
    },
    [onDownload],
  );

  if (!tracks.length) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-400">No tracks found.</div>
    );
  }

  return (
    <div className="flex flex-col">
      {tracks.map((track, index) => {
        const isDownloaded = track.trackUrl ? isTrackDownloaded(track.trackUrl) : false;

        return (
          <div
            key={`${track.trackUrl ?? track.name}-${index}`}
            className="group grid grid-cols-[16px_1fr_auto] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
          >
            {/* Index / Download Icon */}
            <button
              onClick={handleDownloadClick}
              data-url={track.trackUrl}
              className={`flex items-center justify-center w-4 text-base font-medium transition-colors ${
                isDownloaded
                  ? "text-zinc-400 cursor-default"
                  : "text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              disabled={!track.trackUrl || isDownloaded}
              title={isDownloaded ? "Downloaded" : "Download"}
            >
              {isDownloaded ? (
                <span>{index + 1}</span>
              ) : (
                <>
                  <span className="group-hover:hidden">{index + 1}</span>
                  <i className="hidden group-hover:block fa-solid fa-download text-white text-sm" />
                </>
              )}
            </button>

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
