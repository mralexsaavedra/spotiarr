import { FC } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  if (completedCount > 0 || (isDownloading && totalCount > 0)) {
    return (
      <div className="mt-4 w-full">
        <div className="text-text-secondary mb-1.5 flex items-center justify-between text-xs font-bold tracking-wider uppercase">
          <span>
            {completedCount} / {totalCount} {t("playlist.downloaded").toLowerCase()}
          </span>
          <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500 ease-out"
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
      <p className="text-text-secondary line-clamp-2 text-sm font-medium">{description}</p>
    </div>
  );
};
