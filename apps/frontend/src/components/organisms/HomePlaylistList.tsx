import { FC, memo, useCallback } from "react";
import { HomePlaylistCard } from "../molecules/HomePlaylistCard";
import { PlaylistWithStats } from "@/types";

interface HomePlaylistListItem {
  playlist: PlaylistWithStats;
  downloadedCount: number;
  totalCount: number;
}

interface HomePlaylistListProps {
  items: HomePlaylistListItem[];
  onPlaylistClick: (id: string) => void;
}

export const HomePlaylistList: FC<HomePlaylistListProps> = memo(({ items, onPlaylistClick }) => {
  const handleClick = useCallback(
    (id: string) => {
      onPlaylistClick(id);
    },
    [onPlaylistClick],
  );

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map(({ playlist, downloadedCount, totalCount }) => (
        <HomePlaylistCard
          key={playlist.id}
          playlist={playlist}
          downloadedCount={downloadedCount}
          totalCount={totalCount}
          onClick={handleClick}
        />
      ))}
    </div>
  );
});

HomePlaylistList.displayName = "HomePlaylistList";
