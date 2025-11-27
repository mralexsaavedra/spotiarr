import { FC } from "react";
import { Button } from "../atoms/Button";

interface PlaylistActionsProps {
  isSubscribed: boolean;
  hasFailed: boolean;
  isRetrying: boolean;
  onToggleSubscription: () => void;
  onRetryFailed: () => void;
  onDelete: () => void;
}

export const PlaylistActions: FC<PlaylistActionsProps> = ({
  isSubscribed,
  hasFailed,
  isRetrying,
  onToggleSubscription,
  onRetryFailed,
  onDelete,
}) => {
  return (
    <>
      <Button
        variant={isSubscribed ? "primary" : "secondary"}
        size="md"
        icon={isSubscribed ? "fa-check" : "fa-bell"}
        onClick={onToggleSubscription}
        title={isSubscribed ? "Unsubscribe from updates" : "Subscribe to updates"}
      >
        {isSubscribed ? "Subscribed" : "Subscribe"}
      </Button>

      {hasFailed && (
        <Button
          variant="secondary"
          size="md"
          icon="fa-repeat"
          disabled={isRetrying}
          onClick={onRetryFailed}
        >
          Retry failed
        </Button>
      )}

      <Button variant="danger" size="md" icon="fa-trash" onClick={onDelete}>
        <span className="hidden sm:inline">Delete playlist</span>
      </Button>
    </>
  );
};
