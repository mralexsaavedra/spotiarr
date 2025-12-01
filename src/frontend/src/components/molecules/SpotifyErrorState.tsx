import { FC, useCallback } from "react";
import { ConnectSpotifyPrompt } from "./ConnectSpotifyPrompt";
import { RateLimitedMessage } from "./RateLimitedMessage";

interface SpotifyErrorStateProps {
  error: string | null;
  message?: string;
  className?: string;
}

export const SpotifyErrorState: FC<SpotifyErrorStateProps> = ({
  error,
  message = "Failed to load data.",
  className = "",
}) => {
  const handleConnectSpotify = useCallback(() => {
    window.location.href = "/api/auth/spotify/login";
  }, []);

  if (!error) return null;

  if (error === "missing_user_access_token") {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <ConnectSpotifyPrompt onConnect={handleConnectSpotify} />
      </div>
    );
  }

  if (error === "spotify_rate_limited") {
    return (
      <div className={`flex items-center gap-2 text-text-secondary ${className}`}>
        <RateLimitedMessage />
      </div>
    );
  }

  return (
    <div className={`text-text-secondary flex items-center gap-2 ${className}`}>
      <i className="fa-solid fa-triangle-exclamation text-red-400" />
      <span>{message}</span>
    </div>
  );
};
