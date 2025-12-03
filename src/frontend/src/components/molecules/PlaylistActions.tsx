import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Button } from "../atoms/Button";
import { SpotifyLinkButton } from "../atoms/SpotifyLinkButton";

interface PlaylistActionsProps {
  spotifyUrl: string;
  isSubscribed: boolean;
  hasFailed: boolean;
  isRetrying: boolean;
  isDownloading: boolean;
  isDownloaded: boolean;
  onToggleSubscription: () => void;
  onRetryFailed: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

export const PlaylistActions: FC<PlaylistActionsProps> = ({
  isSubscribed,
  hasFailed,
  isRetrying,
  isDownloading,
  isDownloaded,
  onToggleSubscription,
  onRetryFailed,
  onDelete,
  onDownload,
  spotifyUrl,
}) => {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant="primary"
        size="lg"
        className={`!w-14 !h-14 !p-0 justify-center !rounded-full shadow-lg transition-transform ${
          isDownloaded
            ? "bg-green-500 hover:bg-green-600 cursor-default"
            : "bg-green-500 hover:bg-green-600 hover:scale-105"
        }`}
        onClick={onDownload}
        loading={isDownloading}
        disabled={isDownloaded || isDownloading}
        title={isDownloaded ? "Downloaded" : isDownloading ? "Downloading..." : "Download Playlist"}
      >
        {isDownloaded ? (
          <FontAwesomeIcon icon="check" className="text-xl text-black" />
        ) : !isDownloading ? (
          <FontAwesomeIcon icon="download" className="text-xl text-black" />
        ) : null}
      </Button>

      <Button
        variant="secondary"
        size="lg"
        className={`!w-14 !h-14 !p-0 justify-center !rounded-full shadow-lg transition-transform border-2 ${
          isSubscribed
            ? "bg-green-500 border-green-500 text-black hover:bg-green-400 hover:border-green-400 hover:scale-105"
            : "bg-transparent border-gray-500 text-gray-400 hover:text-white hover:border-white hover:scale-105"
        }`}
        onClick={onToggleSubscription}
        title={isSubscribed ? "Remove from Library" : "Add to Library"}
      >
        <FontAwesomeIcon icon="bell" className="text-xl" />
      </Button>

      {spotifyUrl && <SpotifyLinkButton url={spotifyUrl} />}

      <div className="flex-1" />

      {hasFailed && (
        <Button
          variant="ghost"
          size="lg"
          icon="repeat"
          loading={isRetrying}
          className="text-text-secondary hover:text-text-primary hover:bg-white/10"
          onClick={onRetryFailed}
          title="Retry Failed Downloads"
        >
          <span className="hidden sm:inline">Retry Failed</span>
        </Button>
      )}

      <Button
        variant="ghost"
        size="lg"
        icon="trash"
        className="text-text-secondary hover:text-red-400 hover:bg-red-500/10"
        onClick={onDelete}
        title="Delete Playlist"
      >
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );
};
