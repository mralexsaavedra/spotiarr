import { FC, memo } from "react";
import { Image } from "../atoms/Image";

interface ArtistCardProps {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
  onClick: (id: string) => void;
}

export const ArtistCard: FC<ArtistCardProps> = memo(({ id, name, image, onClick }) => {
  const handleCardClick = () => {
    onClick(id);
  };

  return (
    <article
      key={id}
      className="flex flex-col gap-3 p-3 transition-colors rounded-md cursor-pointer group hover:bg-background-hover"
      onClick={handleCardClick}
    >
      <div className="relative w-full overflow-hidden rounded-full shadow-lg aspect-square bg-zinc-800">
        <Image
          src={image || undefined}
          alt={name}
          loading="lazy"
          fallbackIcon="user"
          className="group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <h3 className="text-base font-bold text-white truncate">{name}</h3>
        <p className="text-sm text-zinc-400">Artist</p>
      </div>
    </article>
  );
});
