import { FC, ReactNode } from "react";
import { Loading } from "../atoms/Loading";

interface DetailLayoutProps {
  imageUrl: string | null;
  fallbackIconClass: string;
  imageShape?: "square" | "circle";
  typeLabel?: string;
  title: string;
  description?: string | null;
  meta?: ReactNode;
  spotifyUrl?: string | null;
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
  spotifyUrl,
  actions,
  children,
  isLoading,
  emptyMessage,
}) => {
  const imageClasses =
    imageShape === "circle"
      ? "rounded-full overflow-hidden bg-background-elevated flex-shrink-0 shadow-lg"
      : "rounded-md overflow-hidden shadow-2xl bg-background-elevated flex-shrink-0";

  return (
    <section className="flex-1 bg-background overflow-y-auto">
      <div className="bg-gradient-to-b from-background-elevated to-background px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end">
          <div className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 ${imageClasses}`}>
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className={`${fallbackIconClass} text-4xl md:text-6xl text-text-secondary`} />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1 md:space-y-2 min-w-0">
            {typeLabel && (
              <p className="text-xs font-semibold text-text-secondary uppercase">{typeLabel}</p>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary break-words">
              {title}
            </h1>
            {description && <p className="text-sm text-text-secondary">{description}</p>}
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              {meta}
              {spotifyUrl && (
                <>
                  {meta && <span className="hidden sm:inline">•</span>}
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-light transition-colors flex items-center gap-1"
                  >
                    <i className="fa-brands fa-spotify" />
                    <span className="hidden sm:inline">Open in Spotify</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {actions && (
        <div className="px-4 md:px-8 py-4 md:py-6 flex flex-wrap items-center gap-2 md:gap-4 bg-gradient-to-b from-black/20 to-transparent">
          {actions}
        </div>
      )}

      <div className="px-4 md:px-8 pb-8">
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
    </section>
  );
};
