import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApiRoutes, LibraryArtist } from "@spotiarr/shared";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";

interface LibraryArtistCardProps {
  artist: LibraryArtist;
  onClick?: (artist: LibraryArtist) => void;
}

export const LibraryArtistCard: FC<LibraryArtistCardProps> = memo(({ artist, onClick }) => {
  const { t } = useTranslation();

  const imageUrl = artist.image
    ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(artist.image)}`
    : null;

  return (
    <div
      onClick={() => onClick?.(artist)}
      className="bg-card hover:bg-card-hover group cursor-pointer rounded-lg border border-white/5 p-4 transition-all hover:scale-[1.02] hover:shadow-lg"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={artist.name}
          className="bg-card mb-3 aspect-square w-full rounded-md object-cover"
          loading="lazy"
        />
      ) : (
        <div className="bg-brand-primary/10 text-brand-primary mb-3 flex aspect-square w-full items-center justify-center rounded-md text-4xl">
          <FontAwesomeIcon icon={faMusic} />
        </div>
      )}
      <h3 className="text-text-primary mb-1 truncate font-medium" title={artist.name}>
        {artist.name}
      </h3>
      <p className="text-text-secondary text-xs">
        {artist.albumCount}{" "}
        {artist.albumCount === 1 ? t("common.album", "Album") : t("common.albums", "Albums")} •{" "}
        {artist.trackCount}{" "}
        {artist.trackCount === 1 ? t("common.track", "Track") : t("common.tracks", "Tracks")}
      </p>
    </div>
  );
});

LibraryArtistCard.displayName = "LibraryArtistCard";
