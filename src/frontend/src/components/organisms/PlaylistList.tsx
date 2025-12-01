import { FC, memo, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { useGridColumns } from "../../hooks/useGridColumns";
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

export const PlaylistList: FC<PlaylistListProps> = ({ playlists }) => {
  const columns = useGridColumns();

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < playlists.length; i += columns) {
      result.push(playlists.slice(i, i + columns));
    }
    return result;
  }, [playlists, columns]);

  return (
    <Virtuoso
      useWindowScroll
      data={rows}
      itemContent={(_, rowItems) => (
        <div
          className="grid gap-4 mb-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {rowItems.map((playlist) => (
            <PlaylistListItem key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    />
  );
};
