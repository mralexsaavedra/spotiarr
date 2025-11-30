import { FC, ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  className?: string;
  action?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, className = "", action }) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
};
