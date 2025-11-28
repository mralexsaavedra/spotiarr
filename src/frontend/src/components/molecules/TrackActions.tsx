import { FC, useCallback } from "react";
import { TrackStatus } from "../../types/track";

interface TrackActionsProps {
  trackId: string | null;
  status: TrackStatus;
  onRetry: (trackId: string) => void;
}

export const TrackActions: FC<TrackActionsProps> = ({ trackId, status, onRetry }) => {
  const handleRetry = useCallback(() => {
    if (trackId) onRetry(trackId);
  }, [trackId, onRetry]);

  if (!trackId) return null;

  return (
    <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      {status === TrackStatus.Error && (
        <button
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="Retry download"
          onClick={handleRetry}
        >
          <i className="fa-solid fa-repeat" />
        </button>
      )}
    </div>
  );
};
