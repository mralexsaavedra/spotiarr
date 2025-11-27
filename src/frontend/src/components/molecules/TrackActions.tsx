import { FC, useCallback } from "react";
import { TrackStatus } from "../../types/track";

interface TrackActionsProps {
  trackId: string | null;
  status: TrackStatus;
  onRetry: (trackId: string) => void;
  onDelete: (trackId: string) => void;
}

export const TrackActions: FC<TrackActionsProps> = ({ trackId, status, onRetry, onDelete }) => {
  const handleRetry = useCallback(() => {
    if (trackId) onRetry(trackId);
  }, [trackId, onRetry]);

  const handleDelete = useCallback(() => {
    if (trackId) onDelete(trackId);
  }, [trackId, onDelete]);

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
      <button
        className="text-text-secondary hover:text-red-400 transition-colors"
        title="Remove track"
        onClick={handleDelete}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
};
