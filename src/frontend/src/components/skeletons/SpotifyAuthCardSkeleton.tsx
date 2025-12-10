import { FC } from "react";

export const SpotifyAuthCardSkeleton: FC = () => {
  return (
    <div className="bg-background-elevated space-y-4 rounded-lg border border-white/10 p-6">
      <div className="flex items-start justify-between">
        <div className="w-full max-w-2xl space-y-2">
          <h2 className="text-text-primary flex items-center gap-2 text-lg font-bold">
            <div className="h-6 w-6 animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
          </h2>
          <div className="space-y-1 pt-1">
            <div className="h-4 w-full animate-pulse rounded bg-white/10" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
      </div>
      <div className="pt-2">
        <div className="h-10 w-48 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
};
