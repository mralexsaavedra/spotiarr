import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";
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
  return (
    <div
      onClick={() => onClick(playlist.id)}
      className={cn(
        "group block cursor-pointer rounded-md bg-background-elevated p-4 transition-colors duration-300 hover:bg-background-hover",
        className,
      )}
    >
      <div className="relative mb-4 overflow-hidden rounded-md shadow-lg aspect-square bg-background-hover">
        {playlist.subscribed && (
          <div
            className="absolute z-10 flex items-center justify-center w-8 h-8 rounded-full shadow-md right-2 top-2 bg-black/60 backdrop-blur-sm"
            title="Subscribed"
          >
            <FontAwesomeIcon icon={["fas", "bell"]} className="text-sm text-green-500" />
          </div>
        )}
        <Image
          src={playlist.coverUrl || undefined}
          alt={playlist.name || "Playlist cover"}
          loading="lazy"
          className="group-hover:scale-105"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3
          className="text-base font-bold text-white truncate"
          title={playlist.name || "Unnamed Playlist"}
        >
          {playlist.name || "Unnamed Playlist"}
        </h3>

        <div className="flex min-h-[20px] items-center gap-2 truncate text-sm text-text-subtle">
          <PlaylistStatusBadge {...stats} />
        </div>
      </div>
    </div>
  );
});

PlaylistCard.displayName = "PlaylistCard";
