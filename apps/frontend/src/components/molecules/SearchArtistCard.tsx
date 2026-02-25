import { FollowedArtist } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "../atoms/Image";

interface SearchArtistCardProps {
  artist: FollowedArtist;
  onClick: (id: string) => void;
}

export const SearchArtistCard: FC<SearchArtistCardProps> = ({ artist, onClick }) => {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => onClick(artist.id)}
      className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg p-3 transition-colors hover:bg-white/5"
    >
      <div className="relative aspect-square w-full max-w-40 overflow-hidden rounded-full bg-zinc-800 shadow-lg">
        <Image
          src={artist.image ?? undefined}
          alt={artist.name}
          fallbackIcon="user"
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="w-full text-center">
        <p className="truncate text-sm font-semibold text-white">{artist.name}</p>
        <p className="text-xs text-zinc-400">{t("artist.type")}</p>
      </div>
    </div>
  );
};
