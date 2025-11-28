import { FC } from "react";
import { Skeleton } from "../atoms/Skeleton";

export const PlaylistDetailSkeleton: FC = () => {
  return (
    <div className="flex-1 bg-background overflow-y-auto h-full">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-b from-background-elevated to-background px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end">
          {/* Image */}
          <Skeleton className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 flex-shrink-0 shadow-2xl" />

          {/* Metadata */}
          <div className="flex-1 space-y-2 w-full">
            <Skeleton className="h-4 w-20" /> {/* Type label */}
            <Skeleton className="h-10 md:h-16 w-3/4 max-w-xl" /> {/* Title */}
            <Skeleton className="h-4 w-1/2 max-w-md" /> {/* Description */}
            <div className="flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Skeleton */}
      <div className="px-4 md:px-8 py-4 md:py-6 flex gap-4">
        <Skeleton className="w-14 h-14 rounded-full" /> {/* Play button */}
        <Skeleton className="w-8 h-8 rounded-full" /> {/* Action button */}
        <Skeleton className="w-8 h-8 rounded-full" /> {/* Action button */}
      </div>

      {/* Tracks List Skeleton */}
      <div className="px-4 md:px-8 pb-8 space-y-2">
        {/* Header row */}
        <div className="flex gap-4 px-3 py-2 border-b border-white/10 mb-4">
          <Skeleton className="w-8 h-4" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-24 h-4 hidden md:block" />
          <Skeleton className="w-16 h-4" />
        </div>

        {/* Rows */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2">
            <Skeleton className="w-8 h-4" /> {/* Index */}
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-1" /> {/* Title */}
              <Skeleton className="h-4 w-32" /> {/* Artist */}
            </div>
            <Skeleton className="w-24 h-4 hidden md:block" /> {/* Album/Date */}
            <Skeleton className="w-16 h-4" /> {/* Duration */}
          </div>
        ))}
      </div>
    </div>
  );
};
