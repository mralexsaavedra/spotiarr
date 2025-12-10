import { faCheck, faCompactDisc, faDownload, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, memo, MouseEvent, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { formatRelativeDate } from "../../utils/date";
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
  onDownloadClick: (e: MouseEvent<HTMLButtonElement>) => void;
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
        : albumType === "album"
          ? t("common.cards.albumTypes.album")
          : albumType === "compilation"
            ? t("common.cards.albumTypes.compilation")
            : t("common.cards.albumTypes.release");

    const dateDisplay = releaseDate
      ? formatRelativeDate(new Date(releaseDate).getTime(), false)
      : "";

    return (
      <article
        key={`${albumId}-${artistId}`}
        className="p-4 transition-all rounded-md cursor-pointer group bg-background-elevated hover:bg-background-hover"
        onClick={onCardClick}
      >
        <div className="relative mb-4 overflow-hidden rounded-md shadow-lg aspect-square bg-background-hover">
          <Image
            src={coverUrl || undefined}
            alt={albumName}
            loading="lazy"
            fallbackIcon={faCompactDisc}
            className="group-hover:scale-105"
          />

          {spotifyUrl && (
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity bg-black/40 ${
                isDownloading ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100"
              }`}
            >
              <button
                onClick={onDownloadClick}
                disabled={isDownloaded || isDownloading}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  isDownloaded
                    ? "bg-green-500 cursor-not-allowed"
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
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold truncate text-text-primary group-hover:underline">
            {albumName}
          </h3>
          <span
            className="block text-xs truncate cursor-pointer text-text-secondary hover:underline hover:text-text-primary"
            onClick={handleArtistClick}
          >
            {artistName}
          </span>
          <div className="flex items-center gap-1 text-xs truncate text-text-secondary">
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
