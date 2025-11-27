import { FC, MouseEvent } from "react";

interface ReleaseCardProps {
  albumId: string;
  artistId: string;
  albumName: string;
  artistName: string;
  coverUrl?: string | null;
  releaseDate?: string | null;
  spotifyUrl?: string | null;
  isDownloaded?: boolean;
  onCardClick: () => void;
  onDownloadClick: (e: MouseEvent<HTMLButtonElement>) => void;
  onSpotifyLinkClick: (e: MouseEvent<HTMLAnchorElement>) => void;
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
  onCardClick,
  onDownloadClick,
  onSpotifyLinkClick,
}) => {
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
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-compact-disc text-4xl text-text-secondary" />
          </div>
        )}

        {spotifyUrl && (
          <div className="absolute inset-0 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-black/40">
            <button
              onClick={onDownloadClick}
              disabled={isDownloaded}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
                isDownloaded ? "bg-green-500 cursor-not-allowed" : "bg-primary hover:scale-110"
              }`}
              title={isDownloaded ? "Already downloaded" : "Download"}
            >
              <i className={`fa-solid ${isDownloaded ? "fa-check" : "fa-download"} text-black`} />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-text-primary text-sm truncate group-hover:underline">
          {albumName}
        </h3>
        <p className="text-xs text-text-secondary truncate">{artistName}</p>
        {releaseDate && <p className="text-xs text-text-secondary">{releaseDate}</p>}
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors"
            onClick={onSpotifyLinkClick}
          >
            <i className="fa-brands fa-spotify" />
            <span>Spotify</span>
          </a>
        )}
      </div>
    </article>
  );
};
