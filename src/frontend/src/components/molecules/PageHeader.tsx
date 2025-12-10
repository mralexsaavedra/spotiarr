import { FC, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface PageHeaderProps {
  title: string;
  className?: string;
  action?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, className = "", action }) => {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h1 className="text-text-primary text-2xl font-bold">{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
};
