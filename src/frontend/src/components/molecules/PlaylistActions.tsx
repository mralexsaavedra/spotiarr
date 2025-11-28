import { FC } from "react";
import { Button } from "../atoms/Button";

interface PlaylistActionsProps {
  isSubscribed: boolean;
  hasFailed: boolean;
  isRetrying: boolean;
  onToggleSubscription: () => void;
  onRetryFailed: () => void;
  onDelete: () => void;
  spotifyUrl?: string;
}

export const PlaylistActions: FC<PlaylistActionsProps> = ({
  isSubscribed,
  hasFailed,
  isRetrying,
  onToggleSubscription,
  onRetryFailed,
  onDelete,
  spotifyUrl,
}) => {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant="primary"
        size="lg"
        className={`!w-14 !h-14 !p-0 justify-center !rounded-full shadow-lg transition-transform ${
          isSubscribed ? "bg-green-500 hover:bg-green-600" : "hover:scale-105"
        }`}
        onClick={onToggleSubscription}
        title={isSubscribed ? "Unsubscribe from updates" : "Subscribe to updates"}
      >
        <i className={`fa-solid ${isSubscribed ? "fa-check" : "fa-bell"} text-xl`} />
      </Button>

      {spotifyUrl && (
        <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
          <Button
            variant="secondary"
            size="md"
            className="!rounded-full !px-6 border border-zinc-600 hover:border-white"
            icon="fa-brands fa-spotify"
          >
            Open in Spotify
          </Button>
        </a>
      )}

      {hasFailed && (
        <Button
          variant="secondary"
          size="lg"
          icon="fa-repeat"
          disabled={isRetrying}
          onClick={onRetryFailed}
          title="Retry failed downloads"
        >
          Retry Failed
        </Button>
      )}

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="lg"
        icon="fa-trash"
        onClick={onDelete}
        className="text-text-secondary hover:text-red-400 hover:bg-red-500/10"
        title="Delete playlist"
      >
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );
};
