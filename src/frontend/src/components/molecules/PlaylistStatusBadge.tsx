import {
  faCircleArrowDown,
  faCircleExclamation,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { PlaylistStats } from "../../types";

export const PlaylistStatusBadge: FC<PlaylistStats> = ({
  isDownloading,
  hasErrors,
  isCompleted,
  completedCount,
  totalCount,
  errorCount,
}) => {
  const { t } = useTranslation();

  if (isDownloading) {
    return (
      <>
        <FontAwesomeIcon icon={faSpinner} spin className="text-xs text-blue-400" />
        <span>
          <span className="hidden sm:inline">{t("common.cards.status.downloading")} </span>
          {completedCount}/{totalCount}
        </span>
      </>
    );
  }

  if (hasErrors) {
    return (
      <>
        <FontAwesomeIcon icon={faCircleExclamation} className="text-xs text-red-400" />
        <span>
          {errorCount} {t("common.cards.status.failed")}
        </span>
      </>
    );
  }

  if (isCompleted) {
    return (
      <>
        <FontAwesomeIcon icon={faCircleArrowDown} className="text-xs text-primary" />
        <span>
          {totalCount} {t("common.cards.status.tracks", { count: totalCount })}
        </span>
      </>
    );
  }

  return (
    <span>
      {totalCount} {t("common.cards.status.tracks", { count: totalCount })}
    </span>
  );
};
