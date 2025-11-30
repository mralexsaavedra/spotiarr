import { FC } from "react";

interface PageHeaderProps {
  title: string;
  className?: string;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, className = "" }) => {
  return <h1 className={`text-2xl font-bold text-text-primary ${className}`}>{title}</h1>;
};
