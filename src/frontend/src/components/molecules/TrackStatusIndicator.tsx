import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, MouseEvent, ReactNode } from "react";

interface TrackStatusIndicatorProps {
  status?: TrackStatusEnum;
  index: number;
  onRetry?: (e: MouseEvent) => void;
  onDownload?: (e: MouseEvent) => void;
}

const STATUS_RENDERERS: Partial<
  Record<TrackStatusEnum, (props: TrackStatusIndicatorProps) => ReactNode>
> = {
  [TrackStatusEnum.Error]: ({ onRetry }) =>
    onRetry ? (
      <button
        className="text-red-500 hover:text-red-400 transition-colors"
        onClick={onRetry}
        title="Retry download"
        type="button"
      >
        <FontAwesomeIcon icon="rotate-right" />
      </button>
    ) : (
      <span title="Error" className="cursor-help">
        <FontAwesomeIcon icon="triangle-exclamation" className="text-red-500" />
      </span>
    ),
  [TrackStatusEnum.Downloading]: () => (
    <span title="Downloading..." className="cursor-wait">
      <FontAwesomeIcon icon="spinner" spin className="text-primary" />
    </span>
  ),
  [TrackStatusEnum.Queued]: () => (
    <span title="Queued" className="cursor-help">
      <FontAwesomeIcon icon={["far", "clock"]} className="text-text-secondary" />
    </span>
  ),
  [TrackStatusEnum.Searching]: () => (
    <span title="Searching..." className="cursor-wait">
      <FontAwesomeIcon icon="magnifying-glass" className="text-text-secondary" />
    </span>
  ),
};

export const TrackStatusIndicator: FC<TrackStatusIndicatorProps> = (props) => {
  const { status, index, onDownload } = props;

  const Renderer = status ? STATUS_RENDERERS[status] : undefined;

  if (Renderer) {
    return <Renderer {...props} />;
  }

  const showDownloadAction = !!onDownload && status !== TrackStatusEnum.Completed;

  return (
    <>
      <span
        className={
          showDownloadAction ? "hidden md:block md:group-hover:hidden" : "text-text-secondary"
        }
      >
        {index}
      </span>
      {showDownloadAction && (
        <button
          className="block md:hidden md:group-hover:block text-text-secondary hover:text-white transition-colors"
          onClick={onDownload}
          title="Download Track"
          type="button"
        >
          <FontAwesomeIcon icon="download" />
        </button>
      )}
    </>
  );
};
