import { faClock } from "@fortawesome/free-regular-svg-icons";
import {
  faDownload,
  faMagnifyingGlass,
  faRotateRight,
  faSpinner,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, MouseEvent } from "react";
import { useTranslation } from "react-i18next";

interface TrackStatusIndicatorProps {
  status?: TrackStatusEnum;
  index: number;
  onRetry?: (e: MouseEvent) => void;
  onDownload?: (e: MouseEvent) => void;
}

export const TrackStatusIndicator: FC<TrackStatusIndicatorProps> = (props) => {
  const { t } = useTranslation();
  const { status, index, onDownload } = props;

  const getStatusRenderer = () => {
    switch (status) {
      case TrackStatusEnum.Error:
        return ({ onRetry }: TrackStatusIndicatorProps) =>
          onRetry ? (
            <button
              className="text-red-500 transition-colors hover:text-red-400"
              onClick={onRetry}
              title={t("common.trackStatus.retry")}
              type="button"
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          ) : (
            <span title={t("common.trackStatus.error")} className="cursor-help">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500" />
            </span>
          );
      case TrackStatusEnum.Downloading:
        return () => (
          <span title={t("common.trackStatus.downloading")} className="cursor-wait">
            <FontAwesomeIcon icon={faSpinner} spin className="text-primary" />
          </span>
        );
      case TrackStatusEnum.Queued:
        return () => (
          <span title={t("common.trackStatus.queued")} className="cursor-help">
            <FontAwesomeIcon icon={faClock} className="text-text-secondary" />
          </span>
        );
      case TrackStatusEnum.Searching:
        return () => (
          <span title={t("common.trackStatus.searching")} className="cursor-wait">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-text-secondary" />
          </span>
        );
      default:
        return undefined;
    }
  };

  const Renderer = getStatusRenderer();

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
          className="text-text-secondary block transition-colors hover:text-white md:hidden md:group-hover:block"
          onClick={onDownload}
          title={t("common.trackStatus.download")}
          type="button"
        >
          <FontAwesomeIcon icon={faDownload} />
        </button>
      )}
    </>
  );
};
