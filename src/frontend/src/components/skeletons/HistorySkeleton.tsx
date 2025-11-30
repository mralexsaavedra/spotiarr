import { FC } from "react";
import { Skeleton } from "../atoms/Skeleton";

export const HistorySkeleton: FC = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-md bg-background-elevated/50">
          {/* Icon placeholder */}
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />

          {/* Content placeholder */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-3 w-1/4 rounded" />
          </div>

          {/* Date placeholder */}
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      ))}
    </div>
  );
};
