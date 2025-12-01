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
        <i className="fa-solid fa-rotate-right" />
      </button>
    ) : (
      <i className="fa-solid fa-triangle-exclamation text-red-500" title="Error" />
    ),
  [TrackStatusEnum.Downloading]: () => (
    <i className="fa-solid fa-spinner fa-spin text-primary" title="Downloading..." />
  ),
  [TrackStatusEnum.Queued]: () => (
    <i className="fa-regular fa-clock text-text-secondary" title="Queued" />
  ),
  [TrackStatusEnum.Searching]: () => (
    <i className="fa-solid fa-magnifying-glass text-text-secondary" title="Searching..." />
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
          <i className="fa-solid fa-download" />
        </button>
      )}
    </>
  );
};
