import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { cn } from "@/utils/cn";

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
        <FontAwesomeIcon icon={icon} className="text-text-secondary mb-2 text-4xl opacity-50" />
        <h3 className="text-text-primary text-lg font-bold">{title}</h3>
        {description && <p className="text-text-secondary max-w-sm text-sm">{description}</p>}
      </div>
    </div>
  );
};
