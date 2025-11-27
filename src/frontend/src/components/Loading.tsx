import { FC } from "react";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loading: FC<LoadingProps> = ({ message = "Loading...", fullScreen = false }) => {
  const containerClass = fullScreen
    ? "fixed inset-0 flex items-center justify-center bg-background z-50"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        {message && (
          <p className="text-text-secondary text-sm font-medium animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
};
