import { FC, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, description, className = "", action }) => {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-2xl font-bold">{title}</h1>
        {action && <div>{action}</div>}
      </div>
      {description && <p className="text-text-secondary text-sm">{description}</p>}
    </div>
  );
};
