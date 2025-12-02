import { FC, memo } from "react";
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
  return (
    <VirtualGrid
      items={playlists}
      itemKey={(playlist) => playlist.id}
      renderItem={(playlist) => <PlaylistListItem playlist={playlist} />}
    />
  );
};
