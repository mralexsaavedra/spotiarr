import { FC, MouseEvent, useCallback } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { formatRelativeDate } from "../../utils/date";

interface ReleaseCardProps {
  albumId: string;
  artistId: string;
  albumName: string;
  artistName: string;
  coverUrl?: string | null;
  releaseDate?: string | null;
  spotifyUrl?: string | null;
  isDownloaded?: boolean;
  albumType?: string;
  onCardClick: () => void;
  onDownloadClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const ReleaseCard: FC<ReleaseCardProps> = ({
  albumId,
  artistId,
  albumName,
  artistName,
  coverUrl,
  releaseDate,
  spotifyUrl,
  isDownloaded = false,
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

  // Parse release date for relative time if needed, or just use as is if it's already formatted?
  // The prop says `releaseDate?: string`. Usually it's YYYY-MM-DD.
  // I'll assume I can use `formatRelativeDate` if I parse it to timestamp, or just display it.
  // `formatRelativeDate` takes a timestamp (number).
  // Let's try to parse it.
  const dateDisplay = releaseDate ? formatRelativeDate(new Date(releaseDate).getTime()) : "";

  return (
    <div
      key={`${albumId}-${artistId}`}
      className="group flex items-center p-3 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
      onClick={onCardClick}
    >
      {/* Image */}
      <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-background-elevated shadow-sm">
        {coverUrl ? (
          <img src={coverUrl} alt={albumName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-compact-disc text-2xl text-text-secondary" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-4 flex flex-col justify-center">
        <h3 className="font-bold text-text-primary text-base truncate mb-0.5 group-hover:underline">
          {albumName}
        </h3>
        <div className="flex items-center text-sm text-text-secondary truncate">
          <Link
            to={Path.ARTIST_DETAIL.replace(":id", artistId)}
            className="hover:underline hover:text-text-primary truncate"
            onClick={handleStopPropagation}
          >
            {artistName}
          </Link>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
          <span>{typeLabel}</span>
          {dateDisplay && (
            <>
              <span>•</span>
              <span>{dateDisplay}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 ml-4">
        {spotifyUrl && (
          <button
            onClick={onDownloadClick}
            disabled={isDownloaded}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isDownloaded
                ? "text-green-500 cursor-default"
                : "text-text-secondary hover:text-text-primary hover:scale-110"
            }`}
            title={isDownloaded ? "Already downloaded" : "Download"}
          >
            <i
              className={`fa-solid ${isDownloaded ? "fa-circle-check" : "fa-circle-arrow-down"} text-xl`}
            />
          </button>
        )}
      </div>
    </div>
  );
};
