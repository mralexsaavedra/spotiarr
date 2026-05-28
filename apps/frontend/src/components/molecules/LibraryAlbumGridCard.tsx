import { faCompactDisc } from "@fortawesome/free-solid-svg-icons";
import { ApiRoutes, LibraryAlbum } from "@spotiarr/shared";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "@/components/atoms/Image";
import { cn } from "@/utils/cn";

interface LibraryAlbumGridCardProps {
  album: LibraryAlbum;
  artistName: string;
  onClick: (album: LibraryAlbum) => void;
  className?: string;
}

export const LibraryAlbumGridCard: FC<LibraryAlbumGridCardProps> = memo(
  ({ album, artistName, onClick, className }) => {
    const { t } = useTranslation();

    const imageUrl = album.image
      ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(album.image)}`
      : undefined;

    const metaLine = `${album.year ? `${album.year} · ` : ""}${album.trackCount} ${
      album.trackCount === 1 ? t("common.track", "Track") : t("common.tracks", "Tracks")
    }`;

    return (
      <article className={cn("group", className)}>
        <button
          type="button"
          onClick={() => onClick(album)}
          aria-label={t("library.albumCardAriaLabel", {
            name: album.name,
            year: album.year ?? "-",
            tracks: album.trackCount,
            artist: artistName,
          })}
          className="bg-background-elevated hover:bg-background-hover focus-visible:ring-primary w-full cursor-pointer rounded-md p-4 text-left transition-all focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="bg-background-hover relative mb-4 aspect-square overflow-hidden rounded-md shadow-lg">
            <Image
              src={imageUrl}
              alt={album.name}
              loading="lazy"
              fallbackIcon={faCompactDisc}
              className="group-hover:scale-105"
            />
          </div>

          <h3
            className="text-text-primary mb-1 truncate text-base font-semibold"
            title={album.name}
          >
            {album.name}
          </h3>
          <p className="text-text-secondary truncate text-sm">{metaLine}</p>
        </button>
      </article>
    );
  },
);

LibraryAlbumGridCard.displayName = "LibraryAlbumGridCard";
