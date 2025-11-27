import { FC } from "react";

interface PageHeaderProps {
  title: string;
}

export const PageHeader: FC<PageHeaderProps> = ({ title }) => {
  return <h1 className="text-2xl font-bold mb-6 text-text-primary">{title}</h1>;
};
