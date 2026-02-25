import { FollowedArtist } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "../atoms/Image";

interface SearchTopResultCardProps {
  artist: FollowedArtist;
  onClick: (id: string) => void;
}

export const SearchTopResultCard: FC<SearchTopResultCardProps> = ({ artist, onClick }) => {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => onClick(artist.id)}
      className="group flex min-h-[180px] cursor-pointer flex-col justify-end gap-4 overflow-hidden rounded-xl bg-white/5 p-5 transition-colors hover:bg-white/10"
    >
      <div className="relative h-24 w-24 overflow-hidden rounded-full bg-zinc-800 shadow-2xl">
        <Image
          src={artist.image ?? undefined}
          alt={artist.name}
          fallbackIcon="user"
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div>
        <h2 className="mb-1 text-3xl font-extrabold text-white">{artist.name}</h2>
        <span className="inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold tracking-wider text-zinc-300 uppercase">
          {t("artist.type")}
        </span>
      </div>
    </div>
  );
};
