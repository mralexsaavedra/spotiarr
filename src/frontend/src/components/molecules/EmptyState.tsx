import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";

interface EmptyStateProps {
  icon: IconProp | string;
  title: string;
  description: string;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, className = "" }) => {
  let finalIcon = icon;
  if (typeof icon === "string" && icon.startsWith("fa-")) {
    finalIcon = icon.replace(/^fa-/, "") as IconProp;
  }

  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center space-y-4 max-w-md px-4">
        <FontAwesomeIcon icon={finalIcon as IconProp} className="text-6xl text-text-secondary" />
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <p className="text-text-secondary">{description}</p>
      </div>
    </div>
  );
};
