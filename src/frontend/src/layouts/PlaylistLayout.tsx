import { FC, ReactNode } from "react";
import { Loading } from "../components/Loading";

interface PlaylistLayoutProps {
  coverUrl: string | null;
  name: string;
  description?: string | null;
  totalTracks: number;
  type?: string;
  spotifyUrl?: string | null;
  actions: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
}

export const PlaylistLayout: FC<PlaylistLayoutProps> = ({
  coverUrl,
  name,
  description,
  totalTracks,
  type,
  spotifyUrl,
  actions,
  children,
  isLoading,
  emptyMessage = "No tracks in this playlist yet.",
}) => {
  return (
    <section className="flex-1 bg-background overflow-y-auto">
      <div className="bg-gradient-to-b from-background-elevated to-background px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-end">
          <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-md overflow-hidden shadow-2xl bg-background-elevated flex-shrink-0">
            {coverUrl ? (
              <img src={coverUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="fa-solid fa-music text-4xl md:text-6xl text-text-secondary" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1 md:space-y-2 min-w-0">
            {type && <p className="text-xs font-semibold text-text-secondary uppercase">{type}</p>}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary break-words">
              {name}
            </h1>
            {description && <p className="text-sm text-text-secondary">{description}</p>}
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>
                {totalTracks} {totalTracks === 1 ? "track" : "tracks"}
              </span>
              {spotifyUrl && (
                <>
                  <span className="hidden sm:inline">•</span>
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

      <div className="px-4 md:px-8 py-4 md:py-6 flex flex-wrap items-center gap-2 md:gap-4 bg-gradient-to-b from-black/20 to-transparent">
        {actions}
      </div>

      <div className="px-4 md:px-8 pb-8">
        {isLoading ? (
          <Loading message="Loading tracks..." />
        ) : (
          children || (
            <div className="text-center py-12 text-text-secondary">
              <i className="fa-solid fa-music text-4xl mb-4" />
              <p>{emptyMessage}</p>
            </div>
          )
        )}
      </div>
    </section>
  );
};
