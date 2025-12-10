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
        className="group hover:bg-background-hover flex cursor-pointer flex-col gap-3 rounded-md p-3 transition-colors"
        onClick={handleCardClick}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-800 shadow-lg">
          <Image
            src={image || undefined}
            alt={name}
            loading="lazy"
            fallbackIcon="music"
            className="group-hover:scale-105"
          />
        </div>
        <div className="flex min-w-0 flex-col">
          <h3
            className="truncate text-base font-bold text-white group-hover:underline"
            title={name}
          >
            {name}
          </h3>
          <p className="truncate text-sm text-zinc-400">
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
