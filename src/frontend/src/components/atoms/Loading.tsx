import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { cn } from "@/utils/cn";

interface LoadingProps {
  message?: string;
  className?: string;
}

export const Loading: FC<LoadingProps> = ({ message, className = "" }) => {
  return (
    <div className={cn("flex min-h-[50vh] flex-1 items-center justify-center", className)}>
      <div className="space-y-3 text-center">
        <FontAwesomeIcon icon={faCircleNotch} spin className="text-primary text-4xl" />
        {message && <p className="text-text-secondary animate-pulse">{message}</p>}
      </div>
    </div>
  );
};
