import { FC } from "react";

export const SpotifyAuthCardSkeleton: FC = () => {
  return (
    <div className="p-6 space-y-4 border rounded-lg bg-background-elevated border-white/10">
      <div className="flex items-start justify-between">
        <div className="space-y-2 w-full max-w-2xl">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse" />
            <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
          </h2>
          <div className="space-y-1 pt-1">
            <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="pt-2">
        <div className="h-10 w-48 bg-white/10 rounded animate-pulse" />
      </div>
    </div>
  );
};
