import { FC } from "react";
import type { Playlist } from "../types/playlist";
import { Button } from "./Button";
import { PlaylistCard } from "./PlaylistCard";

interface PlaylistListProps {
  playlists: Playlist[];
  onClearAll: () => void;
}

export const PlaylistList: FC<PlaylistListProps> = ({ playlists, onClearAll }) => {
  const hasPlaylists = playlists.length > 0;

  if (playlists.length === 0) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-8 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <i className="fa-solid fa-music text-6xl text-text-secondary" />
          <h2 className="text-2xl font-bold text-text-primary">No playlists yet</h2>
          <p className="text-text-secondary">
            Add a Spotify playlist, album, artist or track URL using the input above to get started.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Your Playlists</h2>
        <Button
          variant="secondary"
          size="md"
          icon="fa-broom"
          onClick={onClearAll}
          disabled={!hasPlaylists}
        >
          <span className="hidden sm:inline">Clear completed</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {playlists.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </section>
  );
};
