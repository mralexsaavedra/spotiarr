import { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "../atoms/Image";

interface PlaylistHeaderProps {
  title: string;
  type: string;
  coverUrl: string | null;
  description?: ReactNode;
  metadata?: ReactNode;
  totalCount: number;
}

export const PlaylistHeader: FC<PlaylistHeaderProps> = ({
  title,
  type,
  coverUrl,
  description,
  metadata,
  totalCount,
}) => {
  const { t } = useTranslation();
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="to-background bg-gradient-to-b from-zinc-800/80 px-6 py-6 md:px-8">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-end">
        {/* Cover Image */}
        <div className="h-48 w-48 flex-shrink-0 shadow-2xl md:h-60 md:w-60">
          <Image
            src={coverUrl || undefined}
            alt={title}
            loading="eager"
            fetchPriority="high"
            className="shadow-lg"
          />
        </div>

        {/* Metadata */}
        <div className="mb-2 w-full min-w-0 flex-1 space-y-4 text-left md:space-y-2">
          <span className="text-text-primary text-xs font-bold tracking-wider uppercase">
            {typeLabel}
          </span>
          <h1 className="text-2xl leading-tight font-black tracking-tighter break-words text-white drop-shadow-md sm:text-4xl md:text-6xl lg:text-8xl">
            {title}
          </h1>

          {description && (
            <div className="mt-4 max-w-full md:max-w-md">
              {typeof description === "string" ? (
                <p className="text-text-secondary line-clamp-2 text-sm font-medium">
                  {description}
                </p>
              ) : (
                description
              )}
            </div>
          )}

          <div className="text-text-primary mt-2 flex flex-wrap items-center justify-start gap-1 text-sm font-medium">
            {metadata}
            <span className="text-text-secondary">•</span>
            <span className="text-text-secondary">
              {totalCount} {t("playlist.songs")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
