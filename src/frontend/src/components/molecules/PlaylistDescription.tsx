import { FC } from "react";

interface PlaylistDescriptionProps {
  description?: string | null;
  completedCount: number;
  totalCount: number;
  isDownloading?: boolean;
}

export const PlaylistDescription: FC<PlaylistDescriptionProps> = ({
  description,
  completedCount,
  totalCount,
  isDownloading,
}) => {
  if (completedCount > 0 || (isDownloading && totalCount > 0)) {
    return (
      <div className="mt-4 w-full">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
          <span>
            {completedCount} / {totalCount} downloaded
          </span>
          <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
            style={{
              width: `${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%`,
            }}
          />
        </div>
      </div>
    );
  }

  if (!description) return null;

  return (
    <div className="mt-4 w-full">
      <p className="text-text-secondary text-sm font-medium line-clamp-2">{description}</p>
    </div>
  );
};
