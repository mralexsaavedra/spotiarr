import { FC } from "react";

interface ConnectSpotifyPromptProps {
  onConnect: () => void;
}

export const ConnectSpotifyPrompt: FC<ConnectSpotifyPromptProps> = ({ onConnect }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md text-center space-y-6 flex flex-col items-center">
        <i className="fa-brands fa-spotify text-6xl text-primary" />
        <h2 className="text-2xl font-bold text-text-primary">Connect Spotify</h2>
        <p className="text-text-secondary">
          To see new releases from the artists you follow, connect your Spotify account.
        </p>
        <button
          onClick={onConnect}
          className="bg-primary hover:bg-primary-light text-black px-6 py-3 text-base rounded-full font-semibold transition-colors flex items-center gap-2"
        >
          <i className="fa-brands fa-spotify" />
          Connect with Spotify
        </button>
      </div>
    </div>
  );
};
