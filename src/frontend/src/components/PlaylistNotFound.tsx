import { FC } from "react";
import { Button } from "./Button";

interface PlaylistNotFoundProps {
  onGoHome: () => void;
}

export const PlaylistNotFound: FC<PlaylistNotFoundProps> = ({ onGoHome }) => {
  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-8 flex items-center justify-center">
      <div className="text-center space-y-4">
        <i className="fa-solid fa-circle-exclamation text-6xl text-text-secondary" />
        <h2 className="text-2xl font-bold text-text-primary">Playlist not found</h2>
        <Button
          variant="primary"
          size="md"
          onClick={onGoHome}
          className="hover:scale-105 transition-transform"
        >
          Go back to library
        </Button>
      </div>
    </section>
  );
};
