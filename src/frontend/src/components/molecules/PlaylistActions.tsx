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
  isSaved: boolean;
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
  isSaved,
  onToggleSubscription,
  onRetryFailed,
  onDelete,
  onDownload,
  spotifyUrl,
}) => {
  return (
    <div className="flex items-center gap-3 md:gap-4">
      <Button
        variant="primary"
        size="lg"
        className={`!w-12 !h-12 md:!w-14 md:!h-14 !p-0 justify-center !rounded-full shadow-lg transition-transform ${
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
        size="md"
        className={`!h-9 md:!h-10 !w-9 md:!w-36 px-0 md:px-0 !rounded-full shadow-lg border-2 justify-center ${
          isSubscribed
            ? "bg-green-500 border-green-500 text-black hover:bg-green-400 hover:border-green-400"
            : "bg-transparent border-white/30 text-white hover:border-white hover:bg-white/10"
        }`}
        onClick={onToggleSubscription}
        title={isSubscribed ? "Unsubscribe" : "Subscribe"}
      >
        <div className="flex items-center justify-center gap-2">
          <FontAwesomeIcon
            icon={isSubscribed ? ["fas", "bell"] : ["far", "bell"]}
            className="text-sm"
          />
          <span className="font-bold text-xs uppercase tracking-wide hidden md:inline">
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </span>
        </div>
      </Button>

      {spotifyUrl && (
        <SpotifyLinkButton url={spotifyUrl}>
          <span className="hidden md:inline">Open in Spotify</span>
        </SpotifyLinkButton>
      )}

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
        className={`text-text-secondary ${
          !isSaved ? "opacity-30 cursor-not-allowed" : "hover:text-red-400 hover:bg-red-500/10"
        }`}
        onClick={onDelete}
        disabled={!isSaved}
        title={!isSaved ? "Download to enable actions" : "Delete Playlist"}
      >
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );
};
