import { faBell } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Playlist, PlaylistStats } from "../../types";
import { cn } from "../../utils/cn";
import { Image } from "../atoms/Image";
import { PlaylistStatusBadge } from "../molecules/PlaylistStatusBadge";

interface PlaylistCardProps {
  playlist: Playlist;
  stats: PlaylistStats;
  onClick: (id: string) => void;
  className?: string;
}

export const PlaylistCard = memo(({ playlist, stats, onClick, className }: PlaylistCardProps) => {
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onClick(playlist.id)}
      className={cn(
        "group bg-background-elevated hover:bg-background-hover block cursor-pointer rounded-md p-4 transition-colors duration-300",
        className,
      )}
    >
      <div className="bg-background-hover relative mb-4 aspect-square overflow-hidden rounded-md shadow-lg">
        {playlist.subscribed && (
          <div
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 shadow-md backdrop-blur-sm"
            title={t("common.cards.tooltips.subscribed")}
          >
            <FontAwesomeIcon icon={faBell} className="text-sm text-green-500" />
          </div>
        )}
        <Image
          src={playlist.coverUrl || undefined}
          alt={playlist.name || t("common.cards.unnamedPlaylist")}
          loading="lazy"
          className="group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3
          className="truncate text-base font-bold text-white"
          title={playlist.name || t("common.cards.unnamedPlaylist")}
        >
          {playlist.name || t("common.cards.unnamedPlaylist")}
        </h3>

        <div className="text-text-subtle flex min-h-[20px] items-center gap-2 truncate text-sm">
          <PlaylistStatusBadge {...stats} />
        </div>
      </div>
    </div>
  );
});

PlaylistCard.displayName = "PlaylistCard";
