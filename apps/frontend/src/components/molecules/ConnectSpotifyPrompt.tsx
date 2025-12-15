import { faSpotify } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Button } from "../atoms/Button";

interface ConnectSpotifyPromptProps {
  onConnect: () => void;
}

export const ConnectSpotifyPrompt: FC<ConnectSpotifyPromptProps> = ({ onConnect }) => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center space-y-6 text-center">
        <FontAwesomeIcon icon={faSpotify} className="text-primary text-6xl" />
        <h2 className="text-text-primary text-2xl font-bold">Connect Spotify</h2>
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
