import { faCheck, faCompactDisc, faDownload, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FC, memo, type MouseEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { formatRelativeDate } from "@/utils/date";
import { Image } from "../atoms/Image";

interface AlbumCardProps {
  albumId: string;
  artistId: string;
  albumName: string;
  artistName: string;
  coverUrl?: string | null;
  releaseDate?: string | null;
  spotifyUrl?: string | null;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  albumType?: string;
  onCardClick: () => void;
  onDownloadClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  onArtistClick: (artistId: string) => void;
}

export const AlbumCard: FC<AlbumCardProps> = memo(
  ({
    albumId,
    artistId,
    albumName,
    artistName,
    coverUrl,
    releaseDate,
    spotifyUrl,
    isDownloaded = false,
    isDownloading = false,
    albumType,
    onCardClick,
    onDownloadClick,
    onArtistClick,
  }) => {
    const { t } = useTranslation();

    const handleArtistClick = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        onArtistClick(artistId);
      },
      [onArtistClick, artistId],
    );

    const typeLabel =
      albumType === "single"
        ? t("common.cards.albumTypes.single")
        : albumType === "ep"
          ? t("common.cards.albumTypes.ep")
          : albumType === "album"
            ? t("common.cards.albumTypes.album")
            : albumType === "compilation"
              ? t("common.cards.albumTypes.compilation")
              : t("common.cards.albumTypes.release");

    const dateDisplay = releaseDate
      ? formatRelativeDate(new Date(releaseDate).getTime(), false)
      : "";

    const hasOverlayControls = spotifyUrl && onDownloadClick;

    return (
      <article
        key={`${albumId}-${artistId}`}
        className="group bg-background-elevated hover:bg-background-hover relative rounded-md p-4 transition-all"
      >
        <button
          type="button"
          onClick={onCardClick}
          aria-label={t("common.cards.albumCardAriaLabel", { name: albumName, artist: artistName })}
          className="focus-visible:ring-primary absolute inset-0 z-10 cursor-pointer rounded-md focus-visible:ring-2 focus-visible:outline-none"
        />

        <div className="bg-background-hover relative mb-4 aspect-square overflow-hidden rounded-md shadow-lg">
          <Image
            src={coverUrl || undefined}
            alt={albumName}
            loading="lazy"
            fallbackIcon={faCompactDisc}
            className="group-hover:scale-105"
          />

          {hasOverlayControls && (
            <div
              className={`absolute inset-0 flex items-center justify-center gap-3 bg-black/40 transition-opacity ${
                isDownloading ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100"
              }`}
            >
              {spotifyUrl && onDownloadClick && (
                <button
                  onClick={onDownloadClick}
                  disabled={isDownloaded || isDownloading}
                  className={`relative z-20 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none ${
                    isDownloaded
                      ? "cursor-not-allowed bg-green-500"
                      : isDownloading
                        ? "bg-background-elevated cursor-wait"
                        : "bg-primary hover:scale-110"
                  }`}
                  title={
                    isDownloaded
                      ? t("common.cards.tooltips.alreadyDownloaded")
                      : isDownloading
                        ? t("common.cards.tooltips.downloading")
                        : t("common.cards.tooltips.download")
                  }
                >
                  {isDownloading ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="text-primary" />
                  ) : (
                    <FontAwesomeIcon
                      icon={isDownloaded ? faCheck : faDownload}
                      className="text-black"
                    />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-text-primary truncate text-sm font-bold group-hover:underline">
            {albumName}
          </h3>
          <button
            type="button"
            onClick={handleArtistClick}
            aria-label={t("common.cards.viewArtist", { name: artistName })}
            className="text-text-secondary hover:text-text-primary relative z-20 block cursor-pointer truncate text-left text-xs hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            {artistName}
          </button>
          <div className="text-text-secondary flex items-center gap-1 truncate text-xs">
            <span>{typeLabel}</span>
            {dateDisplay && (
              <>
                <span>•</span>
                <span>{dateDisplay}</span>
              </>
            )}
          </div>
        </div>
      </article>
    );
  },
);

AlbumCard.displayName = "AlbumCard";
