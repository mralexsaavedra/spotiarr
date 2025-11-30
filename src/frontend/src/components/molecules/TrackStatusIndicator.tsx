import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, MouseEvent } from "react";

interface TrackStatusIndicatorProps {
  status?: TrackStatusEnum;
  index: number;
  onRetry: (e: MouseEvent) => void;
  onDownload?: (e: MouseEvent) => void;
}

export const TrackStatusIndicator: FC<TrackStatusIndicatorProps> = ({
  status,
  index,
  onRetry,
  onDownload,
}) => {
  if (status === TrackStatusEnum.Error) {
    return (
      <button
        className="text-red-500 hover:text-red-400 transition-colors"
        onClick={onRetry}
        title="Retry download"
      >
        <i className="fa-solid fa-rotate-right" />
      </button>
    );
  }

  if (status === TrackStatusEnum.Downloading) {
    return <i className="fa-solid fa-spinner fa-spin text-primary" title="Downloading..." />;
  }

  if (status === TrackStatusEnum.Queued) {
    return <i className="fa-regular fa-clock text-text-secondary" title="Queued" />;
  }

  if (status === TrackStatusEnum.Searching) {
    return <i className="fa-solid fa-magnifying-glass text-text-secondary" title="Searching..." />;
  }

  const showDownloadAction = !!onDownload && status !== TrackStatusEnum.Completed;

  return (
    <>
      <span className={showDownloadAction ? "group-hover:hidden" : ""}>{index + 1}</span>
      {showDownloadAction && (
        <button
          className="hidden group-hover:block text-text-secondary hover:text-white transition-colors"
          onClick={onDownload}
          title="Download Track"
        >
          <i className="fa-solid fa-download" />
        </button>
      )}
    </>
  );
};
