import { FC, ReactNode } from "react";

interface Artist {
  name: string;
  url?: string;
}

interface TrackListItemProps {
  index: number;
  name: string;
  trackUrl?: string;
  artists: Artist[] | string;
  actions?: ReactNode;
}

export const TrackListItem: FC<TrackListItemProps> = ({
  index,
  name,
  trackUrl,
  artists,
  actions,
}) => {
  const renderArtists = () => {
    if (typeof artists === "string") {
      return artists;
    }

    return artists.map((artist, i) => (
      <span key={`${artist.name}-${i}`}>
        {artist.url ? (
          <a
            href={artist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            {artist.name}
          </a>
        ) : (
          <span>{artist.name}</span>
        )}
        {i < artists.length - 1 && <span>, </span>}
      </span>
    ));
  };

  return (
    <div className="group flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-md hover:bg-background-elevated transition-colors">
      {/* Track number */}
      <span className="text-text-secondary text-sm w-6 sm:w-8 text-right">{index + 1}</span>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-medium truncate">
          {trackUrl ? (
            <a
              href={trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </a>
          ) : (
            <span>{name}</span>
          )}
        </p>
        <p className="text-text-secondary text-sm truncate">{renderArtists()}</p>
      </div>

      {/* Actions slot */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
