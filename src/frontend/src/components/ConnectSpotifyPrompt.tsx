import { FC } from "react";
import { Button } from "./Button";

interface ConnectSpotifyPromptProps {
  onConnect: () => void;
}

export const ConnectSpotifyPrompt: FC<ConnectSpotifyPromptProps> = ({ onConnect }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-4">
        <i className="fa-brands fa-spotify text-6xl text-primary" />
        <h2 className="text-2xl font-bold text-text-primary">Connect Spotify</h2>
        <p className="text-text-secondary">
          To see new releases from the artists you follow, connect your Spotify account.
        </p>
        <Button variant="primary" size="lg" icon="fa-spotify" onClick={onConnect}>
          Connect with Spotify
        </Button>
      </div>
    </div>
  );
};
