import { FC, MouseEvent, useCallback } from "react";

interface ArtistCardProps {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
}

export const ArtistCard: FC<ArtistCardProps> = ({ id, name, image, spotifyUrl }) => {
  const handleCardClick = useCallback(() => {
    if (spotifyUrl) {
      window.open(spotifyUrl, "_blank", "noopener,noreferrer");
    }
  }, [spotifyUrl]);

  const handleSpotifyClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (spotifyUrl) {
        window.open(spotifyUrl, "_blank", "noopener,noreferrer");
      }
    },
    [spotifyUrl],
  );

  return (
    <article
      key={id}
      className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-all cursor-pointer flex flex-col items-center text-center"
      onClick={handleCardClick}
    >
      <div className="relative w-24 h-24 mb-3 rounded-full overflow-hidden bg-background-hover shadow-lg">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className="fa-solid fa-user text-3xl text-text-secondary" />
          </div>
        )}
      </div>
      <h3 className="font-semibold text-sm text-text-primary truncate w-full">{name}</h3>
      {spotifyUrl && (
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors"
          onClick={handleSpotifyClick}
        >
          <i className="fa-brands fa-spotify" />
          <span>Open in Spotify</span>
        </button>
      )}
    </article>
  );
};
