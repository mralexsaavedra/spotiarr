import { FC } from "react";
import { Skeleton } from "../atoms/Skeleton";

export const ArtistDetailSkeleton: FC = () => {
  return (
    <div className="flex-1 bg-background overflow-y-auto h-full">
      {/* Header Skeleton */}
      <div className="relative w-full h-[40vh] min-h-[340px] max-h-[500px] bg-zinc-900">
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-10">
          <Skeleton className="h-16 md:h-24 w-2/3 max-w-2xl mb-6" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>

      {/* Action Bar & Content Skeleton */}
      <div className="px-6 md:px-8 pb-10 bg-gradient-to-b from-background to-black min-h-[50vh]">
        {/* Action Buttons */}
        <div className="flex items-center gap-4 py-6">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>

        {/* Popular Tracks Skeleton */}
        <div className="mt-4">
          <Skeleton className="h-8 w-40 mb-4" />

          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-2">
                <Skeleton className="w-4 h-4" /> {/* Index */}
                <Skeleton className="w-10 h-10 rounded" /> {/* Image */}
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-1" />
                </div>
                <Skeleton className="w-12 h-4" /> {/* Duration */}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
