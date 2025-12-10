import { FC } from "react";
import { Skeleton } from "../atoms/Skeleton";

export const PlaylistSkeleton: FC = () => {
  return (
    <div className="bg-background h-full flex-1 overflow-y-auto">
      {/* Header Skeleton */}
      <div className="to-background bg-gradient-to-b from-zinc-800/80 px-6 py-6 md:px-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end">
          {/* Image */}
          <Skeleton className="h-48 w-48 flex-shrink-0 shadow-2xl md:h-60 md:w-60" />

          {/* Metadata */}
          <div className="mb-2 w-full min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-20" /> {/* Type label */}
            <Skeleton className="h-12 w-3/4 max-w-2xl md:h-24" /> {/* Title */}
            {/* Progress Bar */}
            <div className="mt-4 w-full space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded-full" /> {/* Dot */}
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Skeleton */}
      <div className="to-background flex items-center gap-3 bg-gradient-to-b from-black/20 px-6 py-6 md:gap-4 md:px-8">
        <Skeleton className="h-12 w-12 rounded-full md:h-14 md:w-14" /> {/* Download button */}
        <Skeleton className="h-9 w-9 rounded-full md:h-10 md:w-36" /> {/* Subscribe button */}
        <Skeleton className="h-9 w-9 rounded-full md:h-10 md:w-32" /> {/* Spotify button */}
        <div className="flex-1" />
        <Skeleton className="hidden h-10 w-24 rounded-md sm:block" /> {/* Delete/Retry button */}
      </div>

      {/* Tracks List Skeleton */}
      <div className="space-y-2 px-6 pb-8 md:px-8">
        {/* Header row */}
        <div className="mb-4 grid grid-cols-[auto_1fr_auto] gap-4 border-b border-white/10 px-4 py-2 md:grid-cols-[16px_1fr_1fr_180px]">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <div className="flex justify-end">
            <Skeleton className="h-4 w-4" />
          </div>
        </div>

        {/* Rows */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-2 md:grid-cols-[16px_1fr_1fr_180px]"
          >
            <Skeleton className="h-4 w-4" /> {/* Index */}
            <div className="flex min-w-0 flex-col gap-1">
              <Skeleton className="h-5 w-48" /> {/* Title */}
              <Skeleton className="h-4 w-32" /> {/* Artist */}
            </div>
            <Skeleton className="hidden h-4 w-32 md:block" /> {/* Album */}
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-4 w-4 rounded-full" /> {/* Status Icon */}
              <Skeleton className="h-4 w-10" /> {/* Duration */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
