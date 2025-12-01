import { FC, forwardRef, HTMLAttributes, memo } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { usePlaylistStats } from "../../hooks/usePlaylistStats";
import type { Playlist } from "../../types/playlist";
import { PlaylistCard } from "./PlaylistCard";

interface PlaylistListItemProps {
  playlist: Playlist;
}

const PlaylistListItem: FC<PlaylistListItemProps> = memo(({ playlist }) => {
  const stats = usePlaylistStats(playlist);

  return <PlaylistCard playlist={playlist} stats={stats} />;
});

interface PlaylistListProps {
  playlists: Playlist[];
}

const GridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div
    ref={ref}
    {...props}
    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
  />
));

const GridItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} className="contents" />
));

export const PlaylistList: FC<PlaylistListProps> = ({ playlists }) => {
  return (
    <VirtuosoGrid
      useWindowScroll
      data={playlists}
      components={{
        List: GridList,
        Item: GridItem,
      }}
      itemContent={(index, playlist) => <PlaylistListItem playlist={playlist} />}
    />
  );
};
