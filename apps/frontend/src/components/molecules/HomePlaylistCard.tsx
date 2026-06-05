import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { FC, memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PlaylistWithStats } from "@/types";
import { Image } from "../atoms/Image";

interface HomePlaylistCardProps {
  playlist: PlaylistWithStats;
  downloadedCount: number;
  totalCount: number;
  onClick: (id: string) => void;
}

export const HomePlaylistCard: FC<HomePlaylistCardProps> = memo(
  ({ playlist, downloadedCount, totalCount, onClick }) => {
    const { t } = useTranslation();

    const handleClick = useCallback(() => {
      onClick(playlist.id);
    }, [onClick, playlist.id]);

    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={t("library.playlistCardAriaLabel", {
          name: playlist.name ?? "",
          downloaded: downloadedCount,
          total: totalCount,
        })}
        className="bg-background-elevated hover:bg-background-hover focus-visible:ring-primary group w-full cursor-pointer rounded-md p-4 text-left transition-all focus-visible:ring-2 focus-visible:outline-none"
      >
        <div className="bg-background-hover relative mb-4 aspect-square overflow-hidden rounded-md shadow-lg">
          <Image
            src={playlist.coverUrl ?? undefined}
            alt={playlist.name ?? ""}
            loading="lazy"
            fallbackIcon={faMusic}
            className="group-hover:scale-105"
          />
        </div>

        <h3
          className="text-text-primary mb-1 truncate text-base font-semibold"
          title={playlist.name ?? ""}
        >
          {playlist.name ?? t("common.cards.unnamedPlaylist", "Unnamed Playlist")}
        </h3>
        <p className="text-text-secondary truncate text-sm">
          {t("common.by", "By")} {playlist.owner ?? ""}
        </p>
        <span className="bg-background-hover text-text-secondary mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium">
          {downloadedCount}/{totalCount}
        </span>
      </button>
    );
  },
);

HomePlaylistCard.displayName = "HomePlaylistCard";
