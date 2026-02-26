import { ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Image } from "../atoms/Image";

export type TopResultItem =
  | { type: "artist"; data: FollowedArtist }
  | { type: "album"; data: ArtistRelease }
  | { type: "track"; data: NormalizedTrack };

interface SearchTopResultCardProps {
  item: TopResultItem;
  onClick: (item: TopResultItem) => void;
}

export const SearchTopResultCard: FC<SearchTopResultCardProps> = ({ item, onClick }) => {
  const { t } = useTranslation();
  let imageSrc: string | undefined;
  let title: string;
  let subtitle: string | undefined;
  let typeLabel: string;
  let isCircular = false;

  if (item.type === "artist") {
    imageSrc = item.data.image ?? undefined;
    title = item.data.name;
    typeLabel = t("common.cards.albumTypes.artist", "Artista");
    isCircular = true;
  } else if (item.type === "album") {
    imageSrc = item.data.coverUrl ?? undefined;
    title = item.data.albumName;
    subtitle = item.data.artistName;
    typeLabel = t("common.album", "Álbum");
  } else {
    imageSrc = item.data.albumCoverUrl ?? item.data.albumUrl ?? undefined;
    title = item.data.name;
    subtitle = item.data.artist;
    typeLabel = t("common.track", "Canción");
  }

  return (
    <div
      onClick={() => onClick(item)}
      className="group flex min-h-[180px] cursor-pointer flex-col justify-end gap-4 overflow-hidden rounded-xl bg-white/5 p-5 transition-colors hover:bg-white/10"
    >
      <div
        className={`relative h-24 w-24 overflow-hidden bg-zinc-800 shadow-2xl ${
          isCircular ? "rounded-full" : "rounded-md"
        }`}
      >
        <Image
          src={imageSrc}
          alt={title}
          fallbackIcon={item.type === "artist" ? "user" : "music"}
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div>
        <h2 className="mb-1 line-clamp-2 text-3xl font-extrabold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          {subtitle && (
            <span className="text-text-secondary text-sm font-medium hover:underline">
              {subtitle}
            </span>
          )}
          {subtitle && <span className="text-text-secondary text-sm font-medium">•</span>}
          <span className="inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            {typeLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
