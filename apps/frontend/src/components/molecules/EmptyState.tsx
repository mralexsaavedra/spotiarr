import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  icon: IconProp;
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  className = "",
  action,
}) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16", className)}>
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="text-text-secondary opacity-50">
          <FontAwesomeIcon icon={icon} className="text-4xl" />
        </div>
        <div className="space-y-2">
          <h3 className="text-text-primary text-lg font-bold">{title}</h3>
          {description && <p className="text-text-secondary max-w-sm text-sm">{description}</p>}
        </div>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
};
