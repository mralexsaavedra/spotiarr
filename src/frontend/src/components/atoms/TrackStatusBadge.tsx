import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, useMemo } from "react";

interface TrackStatusBadgeProps {
  status: TrackStatusEnum;
}

export const TrackStatusBadge: FC<TrackStatusBadgeProps> = ({ status }) => {
  const statusStyles = useMemo(() => {
    switch (status) {
      case TrackStatusEnum.Completed:
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case TrackStatusEnum.Error:
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case TrackStatusEnum.Downloading:
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  }, [status]);

  const statusText = useMemo(() => {
    switch (status) {
      case TrackStatusEnum.Completed:
        return "COMPLETED";
      case TrackStatusEnum.Error:
        return "ERROR";
      case TrackStatusEnum.Downloading:
        return "DOWNLOADING";
      default:
        return "QUEUED";
    }
  }, [status]);

  const statusIcon = useMemo(() => {
    switch (status) {
      case TrackStatusEnum.Completed:
        return "fa-check";
      case TrackStatusEnum.Error:
        return "fa-xmark";
      case TrackStatusEnum.Downloading:
        return "fa-arrow-down";
      default:
        return "fa-clock";
    }
  }, [status]);

  return (
    <span
      className={`inline-flex items-center justify-center px-2 sm:px-3 py-1 text-xs font-bold rounded-full border flex-shrink-0 ${statusStyles}`}
    >
      <span className="hidden sm:inline">{statusText}</span>
      <i className={`sm:hidden fa-solid ${statusIcon}`} />
    </span>
  );
};
