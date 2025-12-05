import { FC, ReactNode } from "react";
import { AppImage } from "../atoms/AppImage";

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
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="px-6 py-6 bg-gradient-to-b from-zinc-800/80 to-background md:px-8">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-end">
        {/* Cover Image */}
        <div className="flex-shrink-0 w-48 h-48 shadow-2xl md:w-60 md:h-60">
          <AppImage
            src={coverUrl || undefined}
            alt={title}
            loading="eager"
            fetchPriority="high"
            className="shadow-lg"
          />
        </div>

        {/* Metadata */}
        <div className="flex-1 w-full min-w-0 mb-2 space-y-4 text-left md:space-y-2">
          <span className="text-xs font-bold tracking-wider uppercase text-text-primary">
            {typeLabel}
          </span>
          <h1 className="text-2xl font-black leading-tight tracking-tighter text-white break-words sm:text-4xl md:text-6xl lg:text-8xl drop-shadow-md">
            {title}
          </h1>

          {description && (
            <div className="max-w-full mt-4 md:max-w-md">
              {typeof description === "string" ? (
                <p className="text-sm font-medium text-text-secondary line-clamp-2">
                  {description}
                </p>
              ) : (
                description
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-start gap-1 mt-2 text-sm font-medium text-text-primary">
            {metadata}
            <span className="text-text-secondary">•</span>
            <span className="text-text-secondary">{totalCount} songs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
