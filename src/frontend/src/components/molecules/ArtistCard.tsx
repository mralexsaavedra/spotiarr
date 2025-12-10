import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "../atoms/Image";

interface ArtistCardProps {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
  onClick: (id: string) => void;
}

export const ArtistCard: FC<ArtistCardProps> = memo(({ id, name, image, onClick }) => {
  const { t } = useTranslation();
  const handleCardClick = () => {
    onClick(id);
  };

  return (
    <article
      key={id}
      className="group hover:bg-background-hover flex cursor-pointer flex-col gap-3 rounded-md p-3 transition-colors"
      onClick={handleCardClick}
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
    </article>
  );
});
