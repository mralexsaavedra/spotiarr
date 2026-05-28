import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { ApiRoutes, LibraryArtist } from "@spotiarr/shared";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "@/components/atoms/Image";

interface LibraryArtistCardProps {
  artist: LibraryArtist;
  onClick?: (artist: LibraryArtist) => void;
}

export const LibraryArtistCard: FC<LibraryArtistCardProps> = memo(({ artist, onClick }) => {
  const { t } = useTranslation();

  const imageUrl = artist.image
    ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(artist.image)}`
    : null;

  const meta = `${artist.albumCount} ${
    artist.albumCount === 1 ? t("common.album", "Album") : t("common.albums", "Albums")
  } · ${artist.trackCount} ${
    artist.trackCount === 1 ? t("common.track", "Track") : t("common.tracks", "Tracks")
  }`;

  return (
    <button
      type="button"
      onClick={() => onClick?.(artist)}
      aria-label={t("library.artistCardAriaLabel", {
        name: artist.name,
        albums: artist.albumCount,
        tracks: artist.trackCount,
      })}
      className="bg-background-elevated hover:bg-background-hover focus-visible:ring-primary group w-full cursor-pointer rounded-md p-4 text-left transition-all focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-background-hover relative mb-4 aspect-square overflow-hidden rounded-md shadow-lg">
        <Image
          src={imageUrl || undefined}
          alt={artist.name}
          loading="lazy"
          fallbackIcon={faMusic}
          className="group-hover:scale-105"
        />
      </div>

      <h3 className="text-text-primary mb-1 truncate text-base font-semibold" title={artist.name}>
        {artist.name}
      </h3>
      <p className="text-text-secondary text-sm">{meta}</p>
    </button>
  );
});

LibraryArtistCard.displayName = "LibraryArtistCard";
