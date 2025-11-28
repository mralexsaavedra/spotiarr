import { FC, ReactNode } from "react";
import { Loading } from "../atoms/Loading";

interface DetailLayoutProps {
  imageUrl: string | null;
  fallbackIconClass: string;
  imageShape?: "square" | "circle";
  typeLabel?: string;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
}

export const DetailLayout: FC<DetailLayoutProps> = ({
  imageUrl,
  fallbackIconClass,
  imageShape = "square",
  typeLabel,
  title,
  description,
  meta,
  actions,
  children,
  isLoading,
  emptyMessage,
}) => {
  const imageClasses =
    imageShape === "circle"
      ? "rounded-full overflow-hidden bg-background-elevated flex-shrink-0 shadow-lg"
      : "w-48 h-48 md:w-60 md:h-60 shadow-2xl flex-shrink-0";

  return (
    <div className="flex-1 bg-background overflow-y-auto h-full text-text-primary">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-800/80 to-background px-6 md:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Cover Image */}
          <div className={imageClasses}>
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover shadow-lg" />
            ) : (
              <div className="w-full h-full bg-background-elevated flex items-center justify-center">
                <i className={`${fallbackIconClass} text-6xl text-text-secondary`} />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 space-y-2 mb-2">
            {typeLabel && (
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                {typeLabel}
              </span>
            )}
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-md break-words">
              {title}
            </h1>

            {description && (
              <div className="mt-4 max-w-md">
                {typeof description === "string" ? (
                  <p className="text-text-secondary text-sm font-medium line-clamp-2">
                    {description}
                  </p>
                ) : (
                  description
                )}
              </div>
            )}

            <div className="flex items-center gap-1 text-sm font-medium text-text-primary mt-2">
              {meta}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {actions && (
        <div className="px-6 md:px-8 py-6 bg-gradient-to-b from-black/20 to-background">
          {actions}
        </div>
      )}

      {/* Content */}
      <div className="px-6 md:px-8 pb-8">
        {isLoading ? (
          <Loading message={emptyMessage || "Loading..."} />
        ) : children ? (
          children
        ) : emptyMessage ? (
          <div className="text-center py-12 text-text-secondary">
            <p>{emptyMessage}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
