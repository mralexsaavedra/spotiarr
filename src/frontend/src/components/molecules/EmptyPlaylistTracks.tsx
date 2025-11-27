import { FC } from "react";

export const EmptyPlaylistTracks: FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-4 max-w-md">
        <i className="fa-solid fa-music text-5xl text-text-secondary" />
        <h2 className="text-xl font-bold text-text-primary">No tracks in this playlist yet</h2>
        <p className="text-text-secondary">Tracks you download or sync will appear here.</p>
      </div>
    </div>
  );
};
