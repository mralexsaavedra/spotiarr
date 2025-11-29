import { FC } from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, className = "" }) => {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="text-center space-y-4 max-w-md px-4">
        <i className={`fa-solid ${icon} text-6xl text-text-secondary`} />
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <p className="text-text-secondary">{description}</p>
      </div>
    </div>
  );
};
