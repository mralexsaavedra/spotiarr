import { FC, memo, useCallback } from "react";
import { Image } from "../atoms/Image";

interface SpotifyPlaylistCardProps {
  id: string;
  name: string;
  image: string | null;
  owner: string;
  tracks: number;
  ownerUrl?: string;
  onClick: (id: string) => void;
}

export const SpotifyPlaylistCard: FC<SpotifyPlaylistCardProps> = memo(
  ({ id, name, image, owner, ownerUrl, tracks, onClick }) => {
    const handleCardClick = useCallback(() => {
      onClick(id);
    }, [id, onClick]);

    return (
      <article
        key={id}
        className="flex flex-col gap-3 p-3 transition-colors rounded-md cursor-pointer group hover:bg-background-hover"
        onClick={handleCardClick}
      >
        <div className="relative w-full overflow-hidden rounded-md shadow-lg aspect-square bg-zinc-800">
          <Image
            src={image || undefined}
            alt={name}
            loading="lazy"
            fallbackIcon="music"
            className="group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <h3 className="text-base font-bold text-white truncate" title={name}>
            {name}
          </h3>
          <p className="text-sm truncate text-zinc-400">
            By{" "}
            {ownerUrl ? (
              <a
                href={ownerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {owner}
              </a>
            ) : (
              owner
            )}{" "}
            • {tracks} tracks
          </p>
        </div>
      </article>
    );
  },
);

SpotifyPlaylistCard.displayName = "SpotifyPlaylistCard";
