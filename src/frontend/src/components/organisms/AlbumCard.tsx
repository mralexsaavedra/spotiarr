import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, memo, MouseEvent, useCallback } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { formatRelativeDate } from "../../utils/date";

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
  }) => {
    const handleStopPropagation = useCallback((e: MouseEvent) => {
      e.stopPropagation();
    }, []);

    const typeLabel =
      albumType === "single"
        ? "Single"
        : albumType === "album"
          ? "Album"
          : albumType === "compilation"
            ? "Compilation"
            : "Release";

    const dateDisplay = releaseDate ? formatRelativeDate(new Date(releaseDate).getTime()) : "";

    return (
      <article
        key={`${albumId}-${artistId}`}
        className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-all cursor-pointer"
        onClick={onCardClick}
      >
        <div className="relative aspect-square mb-4 rounded-md overflow-hidden bg-background-hover shadow-lg">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={albumName}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FontAwesomeIcon icon="compact-disc" className="text-4xl text-text-secondary" />
            </div>
          )}

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
                    ? "Already downloaded"
                    : isDownloading
                      ? "Downloading..."
                      : "Download"
                }
              >
                {isDownloading ? (
                  <FontAwesomeIcon icon="spinner" spin className="text-primary" />
                ) : (
                  <FontAwesomeIcon
                    icon={isDownloaded ? "check" : "download"}
                    className="text-black"
                  />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-text-primary text-sm truncate group-hover:underline">
            {albumName}
          </h3>
          <Link
            to={Path.ARTIST_DETAIL.replace(":id", artistId)}
            className="text-xs text-text-secondary truncate hover:underline hover:text-text-primary block"
            onClick={handleStopPropagation}
          >
            {artistName}
          </Link>
          <div className="flex items-center gap-1 text-xs text-text-secondary truncate">
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
