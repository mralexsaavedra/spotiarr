import { FC } from "react";
import { Skeleton } from "../atoms/Skeleton";

export const SettingsSkeleton: FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Section 1 */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded mb-6" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded mb-6" />
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-background-elevated rounded-md">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <div className="flex items-center justify-between p-4 bg-background-elevated rounded-md">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
