import { FC } from "react";
import { Skeleton } from "../atoms/Skeleton";

interface CardGridSkeletonProps {
  count?: number;
}

export const CardGridSkeleton: FC<CardGridSkeletonProps> = ({ count = 12 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-background-elevated rounded-md p-4 space-y-4 animate-pulse">
          {/* Image placeholder */}
          <Skeleton className="w-full aspect-square rounded-md" />

          {/* Text placeholder */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
