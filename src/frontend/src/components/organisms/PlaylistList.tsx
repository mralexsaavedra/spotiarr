import { FC, memo } from "react";
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
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {playlists.map((playlist) => (
        <PlaylistListItem key={playlist.id} playlist={playlist} />
      ))}
    </div>
  );
};
