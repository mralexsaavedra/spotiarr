import { FC, memo, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { Path } from "@/routes/routes";
import { getSpotifyIdFromUrl } from "@/utils/spotify";

interface Artist {
  name: string;
  url?: string | null;
}

interface ArtistLinksProps {
  artists: Artist[];
  className?: string;
  linkClassName?: string;
  onLinkClick?: (e: MouseEvent) => void;
}

interface ArtistLinkProps {
  artist: Artist;
  linkClassName?: string;
  onLinkClick?: (e: MouseEvent) => void;
  isLast: boolean;
}

const ArtistLink: FC<ArtistLinkProps> = memo(({ artist, linkClassName, onLinkClick, isLast }) => {
  const artistId = artist.url ? getSpotifyIdFromUrl(artist.url) : null;

  const handleClick = (e: MouseEvent) => {
    if (onLinkClick) onLinkClick(e);
  };

  return (
    <span>
      {artistId ? (
        <Link
          to={Path.ARTIST_DETAIL.replace(":id", artistId)}
          className={linkClassName}
          onClick={handleClick}
        >
          {artist.name}
        </Link>
      ) : (
        <span>{artist.name}</span>
      )}
      {!isLast && ", "}
    </span>
  );
});

export const ArtistLinks: FC<ArtistLinksProps> = ({
  artists,
  className,
  linkClassName,
  onLinkClick,
}) => {
  return (
    <span className={className}>
      {artists.map((artist, i) => (
        <ArtistLink
          key={`${artist.name}-${i}`}
          artist={artist}
          linkClassName={linkClassName}
          onLinkClick={onLinkClick}
          isLast={i === artists.length - 1}
        />
      ))}
    </span>
  );
};
