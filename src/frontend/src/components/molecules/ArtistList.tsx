import { FC, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { getSpotifyIdFromUrl } from "../../utils/spotify";

interface Artist {
  name: string;
  url?: string | null;
}

interface ArtistListProps {
  artists: Artist[];
  className?: string;
  linkClassName?: string;
  onLinkClick?: (e: MouseEvent) => void;
}

export const ArtistList: FC<ArtistListProps> = ({
  artists,
  className,
  linkClassName,
  onLinkClick,
}) => {
  return (
    <span className={className}>
      {artists.map((artist, i) => {
        const artistId = artist.url ? getSpotifyIdFromUrl(artist.url) : null;

        return (
          <span key={`${artist.name}-${i}`}>
            {artistId ? (
              <Link
                to={Path.ARTIST_DETAIL.replace(":id", artistId)}
                className={linkClassName}
                onClick={(e) => {
                  if (onLinkClick) onLinkClick(e);
                }}
              >
                {artist.name}
              </Link>
            ) : (
              <span>{artist.name}</span>
            )}
            {i < artists.length - 1 && ", "}
          </span>
        );
      })}
    </span>
  );
};
