import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Button } from "../atoms/Button";

interface ConnectSpotifyPromptProps {
  onConnect: () => void;
}

export const ConnectSpotifyPrompt: FC<ConnectSpotifyPromptProps> = ({ onConnect }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-6 flex flex-col items-center">
        <FontAwesomeIcon icon={faSpotify} className="text-6xl text-primary" />
        <h2 className="text-2xl font-bold text-text-primary">Connect Spotify</h2>
        <p className="text-text-secondary">
          To see new releases from the artists you follow, connect your Spotify account.
        </p>
        <Button variant="primary" size="lg" icon={faSpotify} onClick={onConnect}>
          Connect with Spotify
        </Button>
      </div>
    </div>
  );
};
