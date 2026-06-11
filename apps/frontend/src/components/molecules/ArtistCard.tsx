import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "../atoms/Image";

interface ArtistCardProps {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl?: string | null;
  onClick: (id: string) => void;
}

export const ArtistCard: FC<ArtistCardProps> = memo(({ id, name, image, onClick }) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      aria-label={name}
      className="group hover:bg-background-hover focus-visible:ring-primary flex w-full cursor-pointer flex-col gap-3 rounded-md p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-zinc-800 shadow-lg">
        <Image
          src={image || undefined}
          alt={name}
          loading="lazy"
          fallbackIcon="user"
          className="group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-col">
        <h3 className="truncate text-base font-bold text-white">{name}</h3>
        <p className="text-sm text-zinc-400">{t("artist.type")}</p>
      </div>
    </button>
  );
});

ArtistCard.displayName = "ArtistCard";
