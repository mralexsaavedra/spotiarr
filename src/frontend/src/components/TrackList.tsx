import { useTracks } from "@/hooks/useTracks";
import { TrackStatus } from "@/types/track";
import clsx from "clsx";

interface Props {
  playlistId: number;
}

const STATUS_CONFIG = {
  [TrackStatus.New]: {
    label: "NEW",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  [TrackStatus.Searching]: {
    label: "SEARCHING",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  [TrackStatus.Queued]: {
    label: "QUEUED",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  [TrackStatus.Downloading]: {
    label: "DOWNLOADING",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  [TrackStatus.Completed]: {
    label: "COMPLETED",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  [TrackStatus.Error]: {
    label: "ERROR",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export const TrackList = ({ playlistId }: Props) => {
  const { tracks, retryTrack, deleteTrack } = useTracks(playlistId);

  const handleRetry = (trackId: number) => {
    if (!Number.isFinite(trackId)) {
      console.warn('Attempted retry with invalid track id', trackId);
      return;
    }
    retryTrack.mutate(trackId);
  };

  const handleDelete = (trackId: number) => {
    if (!Number.isFinite(trackId)) {
      console.warn('Attempted delete with invalid track id', trackId);
      return;
    }
    deleteTrack.mutate(trackId);
  };

  if (tracks.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-spotify-gray-light dark:text-spotify-gray-light">
        <i className="fa-solid fa-music text-3xl mb-2" />
        <p>No tracks yet</p>
      </div>
    );
  }

  return (
    <div>
      {tracks.map((track) => (
        <div
          key={track.id}
          className="flex justify-between items-center px-5 py-3 border-b dark:border-spotify-gray-dark hover:bg-gray-100 dark:hover:bg-spotify-gray-dark transition-all group"
        >
          <div className="flex items-center gap-3 dark:text-white">
            <span className="font-medium">
              <span className="text-spotify-gray-light mr-1">
                {track.artist}
              </span>
              <span className="mx-1 text-spotify-gray-light">•</span>
              <span className="text-black dark:text-white">{track.name}</span>
            </span>

            {track.youtubeUrl && (
              <a
                href={track.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-600 hover:scale-110 transition-all"
                title="View on YouTube"
              >
                <i className="fa-brands fa-youtube" />
              </a>
            )}

            {track.status === TrackStatus.Completed && (
              <a
                href={`/api/track/download/${track.id}`}
                className="text-blue-500 hover:text-blue-600 hover:scale-110 transition-all"
                title="Download file"
                download
              >
                <i className="fa-solid fa-download" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-3">
            {track.status === TrackStatus.Error && (
              <i
                className="fa-solid fa-repeat cursor-pointer hover:text-spotify-green hover:scale-110 transition-all text-spotify-gray-light"
                title="Retry download"
                onClick={() => track.id != null && handleRetry(track.id)}
              />
            )}
            <i
              className="fa-solid fa-xmark cursor-pointer hover:text-red-500 hover:scale-110 transition-all text-spotify-gray-light opacity-0 group-hover:opacity-100"
              title="Remove track"
              onClick={() => track.id != null && handleDelete(track.id)}
            />
            <span
              className={clsx(
                "inline-block px-3 py-1 text-xs font-bold rounded-full border",
                // defensive: fallback to Error class if unknown
                (STATUS_CONFIG as any)[track.status]?.className ||
                  STATUS_CONFIG[TrackStatus.Error].className,
              )}
            >
              {(STATUS_CONFIG as any)[track.status]?.label ||
                STATUS_CONFIG[TrackStatus.Error].label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
