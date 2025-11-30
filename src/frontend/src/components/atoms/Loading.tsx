import { FC } from "react";

interface LoadingProps {
  className?: string;
}

export const Loading: FC<LoadingProps> = ({ className = "" }) => {
  return (
    <div className={`flex-1 flex items-center justify-center min-h-[50vh] ${className}`}>
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-background-elevated rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );
};
