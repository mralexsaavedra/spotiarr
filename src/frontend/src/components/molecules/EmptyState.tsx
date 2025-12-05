import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { cn } from "../../utils/cn";

interface EmptyStateProps {
  icon: IconProp;
  title: string;
  description?: string;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, className = "" }) => {
  return (
    <div className={cn("flex items-center justify-center py-16", className)}>
      <div className="space-y-2 text-center">
        <FontAwesomeIcon icon={icon} className="mb-2 text-4xl opacity-50 text-text-secondary" />
        <h3 className="text-lg font-bold text-text-primary">{title}</h3>
        {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      </div>
    </div>
  );
};
