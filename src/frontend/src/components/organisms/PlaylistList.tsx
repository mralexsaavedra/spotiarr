import { FC, memo, useCallback } from "react";
import { PlaylistWithStats } from "../../types/playlist";
import { VirtualGrid } from "../molecules/VirtualGrid";
import { PlaylistCard } from "./PlaylistCard";

interface PlaylistListItemProps {
  playlist: PlaylistWithStats;
}

const PlaylistListItem: FC<PlaylistListItemProps> = memo(({ playlist }) => {
  return <PlaylistCard playlist={playlist} stats={playlist.stats} />;
});

interface PlaylistListProps {
  playlists: PlaylistWithStats[];
}

export const PlaylistList: FC<PlaylistListProps> = ({ playlists }) => {
  const renderItem = useCallback(
    (playlist: PlaylistWithStats) => <PlaylistListItem playlist={playlist} />,
    [],
  );

  return (
    <VirtualGrid items={playlists} itemKey={(playlist) => playlist.id} renderItem={renderItem} />
  );
};
