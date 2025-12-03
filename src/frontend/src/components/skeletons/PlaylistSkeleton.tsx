import { FC } from "react";
import { Skeleton } from "../atoms/Skeleton";

export const PlaylistSkeleton: FC = () => {
  return (
    <div className="flex-1 bg-background overflow-y-auto h-full">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-b from-zinc-800/80 to-background px-6 md:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
          {/* Image */}
          <Skeleton className="w-48 h-48 md:w-60 md:h-60 shadow-2xl flex-shrink-0" />

          {/* Metadata */}
          <div className="flex-1 space-y-2 mb-2 w-full min-w-0">
            <Skeleton className="h-4 w-20" /> {/* Type label */}
            <Skeleton className="h-12 md:h-24 w-3/4 max-w-2xl" /> {/* Title */}
            {/* Progress Bar */}
            <div className="w-full space-y-2 mt-4">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
            <div className="flex gap-2 items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded-full" /> {/* Dot */}
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Skeleton */}
      <div className="px-6 md:px-8 py-6 bg-gradient-to-b from-black/20 to-background flex items-center gap-3 md:gap-4">
        <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-full" /> {/* Download button */}
        <Skeleton className="w-9 h-9 md:w-36 md:h-10 rounded-full" /> {/* Subscribe button */}
        <Skeleton className="w-9 h-9 md:w-32 md:h-10 rounded-full" /> {/* Spotify button */}
        <div className="flex-1" />
        <Skeleton className="w-24 h-10 rounded-md hidden sm:block" /> {/* Delete/Retry button */}
      </div>

      {/* Tracks List Skeleton */}
      <div className="px-6 md:px-8 pb-8 space-y-2">
        {/* Header row */}
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 px-4 py-2 border-b border-white/10 mb-4">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-24 h-4 hidden md:block" />
          <div className="flex justify-end">
            <Skeleton className="w-4 h-4" />
          </div>
        </div>

        {/* Rows */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 items-center px-4 py-2"
          >
            <Skeleton className="w-4 h-4" /> {/* Index */}
            <div className="flex flex-col gap-1 min-w-0">
              <Skeleton className="h-5 w-48" /> {/* Title */}
              <Skeleton className="h-4 w-32" /> {/* Artist */}
            </div>
            <Skeleton className="h-4 w-32 hidden md:block" /> {/* Album */}
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="w-4 h-4 rounded-full" /> {/* Status Icon */}
              <Skeleton className="w-10 h-4" /> {/* Duration */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
