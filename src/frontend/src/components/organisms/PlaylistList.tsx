import { FC, memo } from "react";
import { usePlaylistStats } from "../../hooks/usePlaylistStats";
import type { Playlist } from "../../types/playlist";
import { VirtualGrid } from "../molecules/VirtualGrid";
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
  return (
    <VirtualGrid
      items={playlists}
      itemKey={(playlist) => playlist.id}
      renderItem={(playlist) => <PlaylistListItem playlist={playlist} />}
    />
  );
};
