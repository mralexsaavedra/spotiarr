import { FC, memo, useCallback } from "react";
import { PlaylistWithStats } from "@/types";
import { HomePlaylistCard } from "../molecules/HomePlaylistCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

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

  const renderItem = useCallback(
    ({ playlist, downloadedCount, totalCount }: HomePlaylistListItem) => (
      <HomePlaylistCard
        playlist={playlist}
        downloadedCount={downloadedCount}
        totalCount={totalCount}
        onClick={handleClick}
      />
    ),
    [handleClick],
  );

  if (items.length === 0) return null;

  return (
    <VirtualGrid items={items} itemKey={({ playlist }) => playlist.id} renderItem={renderItem} />
  );
});

HomePlaylistList.displayName = "HomePlaylistList";
