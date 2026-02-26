import { ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";
import { TFunction } from "i18next";
import { FC, useMemo } from "react";
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

interface ResultConfig {
  imageSrc?: string;
  title: string;
  subtitle?: string;
  typeLabel: string;
  isCircular: boolean;
  fallbackIcon: "user" | "music";
}

const RESULT_CONFIG_MAP: Record<TopResultItem["type"], (data: any, t: TFunction) => ResultConfig> =
  {
    artist: (data: FollowedArtist, t) => ({
      imageSrc: data.image ?? undefined,
      title: data.name,
      typeLabel: t("common.cards.albumTypes.artist", "Artista"),
      isCircular: true,
      fallbackIcon: "user",
    }),
    album: (data: ArtistRelease, t) => ({
      imageSrc: data.coverUrl ?? undefined,
      title: data.albumName,
      subtitle: data.artistName,
      typeLabel: t("common.album", "Álbum"),
      isCircular: false,
      fallbackIcon: "music",
    }),
    track: (data: NormalizedTrack, t) => ({
      imageSrc: data.albumCoverUrl ?? data.albumUrl ?? undefined,
      title: data.name,
      subtitle: data.artist,
      typeLabel: t("common.track", "Canción"),
      isCircular: false,
      fallbackIcon: "music",
    }),
  };

export const SearchTopResultCard: FC<SearchTopResultCardProps> = ({ item, onClick }) => {
  const { t } = useTranslation();

  const config = useMemo(() => RESULT_CONFIG_MAP[item.type](item.data, t), [item, t]);

  return (
    <div
      onClick={() => onClick(item)}
      className="group flex min-h-[180px] cursor-pointer flex-col justify-end gap-4 overflow-hidden rounded-xl bg-white/5 p-5 transition-colors hover:bg-white/10"
    >
      <div
        className={`relative h-24 w-24 overflow-hidden bg-zinc-800 shadow-2xl ${
          config.isCircular ? "rounded-full" : "rounded-md"
        }`}
      >
        <Image
          src={config.imageSrc}
          alt={config.title}
          fallbackIcon={config.fallbackIcon}
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div>
        <h2 className="mb-1 line-clamp-2 text-3xl font-extrabold text-white">{config.title}</h2>
        <div className="flex items-center gap-2">
          {config.subtitle && (
            <span className="text-text-secondary text-sm font-medium hover:underline">
              {config.subtitle}
            </span>
          )}
          {config.subtitle && <span className="text-text-secondary text-sm font-medium">•</span>}
          <span className="inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold tracking-wider text-zinc-300 uppercase">
            {config.typeLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
