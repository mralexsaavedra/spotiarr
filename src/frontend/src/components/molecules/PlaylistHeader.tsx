import { FC, ReactNode } from "react";

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
    <div className="bg-gradient-to-b from-zinc-800/80 to-background px-6 md:px-8 py-6">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
        {/* Cover Image */}
        <div className="w-48 h-48 md:w-60 md:h-60 shadow-2xl flex-shrink-0">
          {coverUrl ? (
            <img src={coverUrl} alt={title} className="w-full h-full object-cover shadow-lg" />
          ) : (
            <div className="w-full h-full bg-background-elevated flex items-center justify-center">
              <i className="fa-solid fa-music text-6xl text-text-secondary" />
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex-1 min-w-0 space-y-4 md:space-y-2 mb-2 text-left w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            {typeLabel}
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-md break-words leading-tight">
            {title}
          </h1>

          {description && (
            <div className="mt-4 max-w-full md:max-w-md">
              {typeof description === "string" ? (
                <p className="text-text-secondary text-sm font-medium line-clamp-2">
                  {description}
                </p>
              ) : (
                description
              )}
            </div>
          )}

          <div className="flex items-center justify-start gap-1 text-sm font-medium text-text-primary mt-2 flex-wrap">
            {metadata}
            <span className="text-text-secondary">•</span>
            <span className="text-text-secondary">{totalCount} songs</span>
          </div>
        </div>
      </div>
    </div>
  );
};
