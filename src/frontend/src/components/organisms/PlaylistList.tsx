import { FC, memo, useCallback } from "react";
import { PlaylistWithStats } from "@/types";
import { PlaylistCard } from "../molecules/PlaylistCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface PlaylistListItemProps {
  playlist: PlaylistWithStats;
  onClick: (id: string) => void;
}

const PlaylistListItem: FC<PlaylistListItemProps> = memo(({ playlist, onClick }) => {
  return <PlaylistCard playlist={playlist} stats={playlist.stats} onClick={onClick} />;
});

interface PlaylistListProps {
  playlists: PlaylistWithStats[];
  onPlaylistClick: (id: string) => void;
}

export const PlaylistList: FC<PlaylistListProps> = ({ playlists, onPlaylistClick }) => {
  const renderItem = useCallback(
    (playlist: PlaylistWithStats) => (
      <PlaylistListItem playlist={playlist} onClick={onPlaylistClick} />
    ),
    [onPlaylistClick],
  );

  return (
    <VirtualGrid items={playlists} itemKey={(playlist) => playlist.id} renderItem={renderItem} />
  );
};
