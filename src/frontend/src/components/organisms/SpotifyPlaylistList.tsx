import { SpotifyPlaylist } from "@spotiarr/shared";
import { FC, memo, useCallback } from "react";
import { SpotifyPlaylistCard } from "../molecules/SpotifyPlaylistCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface SpotifyPlaylistListProps {
  playlists: SpotifyPlaylist[];
  onClick: (id: string) => void;
}

export const SpotifyPlaylistList: FC<SpotifyPlaylistListProps> = memo(({ playlists, onClick }) => {
  const renderItem = useCallback(
    (playlist: SpotifyPlaylist) => (
      <SpotifyPlaylistCard
        id={playlist.id}
        name={playlist.name}
        image={playlist.image}
        owner={playlist.owner}
        tracks={playlist.tracks}
        onClick={onClick}
      />
    ),
    [onClick],
  );

  return (
    <VirtualGrid items={playlists} itemKey={(playlist) => playlist.id} renderItem={renderItem} />
  );
});

SpotifyPlaylistList.displayName = "SpotifyPlaylistList";
