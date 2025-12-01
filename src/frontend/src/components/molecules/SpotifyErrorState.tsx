import { ApiErrorCode } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { ConnectSpotifyPrompt } from "./ConnectSpotifyPrompt";
import { RateLimitedMessage } from "./RateLimitedMessage";

interface SpotifyErrorStateProps {
  error: ApiErrorCode | null;
  message?: string;
  className?: string;
}

interface ErrorRendererProps {
  className?: string;
  onConnect: () => void;
}

const ERROR_RENDERERS: Partial<Record<ApiErrorCode, FC<ErrorRendererProps>>> = {
  missing_user_access_token: ({ className, onConnect }) => (
    <div className={`flex-1 flex items-center justify-center ${className}`}>
      <ConnectSpotifyPrompt onConnect={onConnect} />
    </div>
  ),
  spotify_rate_limited: ({ className }) => (
    <div className={`flex items-center gap-2 text-text-secondary ${className}`}>
      <RateLimitedMessage />
    </div>
  ),
};

export const SpotifyErrorState: FC<SpotifyErrorStateProps> = ({
  error,
  message = "Failed to load data.",
  className = "",
}) => {
  const handleConnectSpotify = useCallback(() => {
    window.location.href = "/api/auth/spotify/login";
  }, []);

  if (!error) return null;

  const Renderer = ERROR_RENDERERS[error];

  if (Renderer) {
    return <Renderer className={className} onConnect={handleConnectSpotify} />;
  }

  return (
    <div className={`text-text-secondary flex items-center gap-2 ${className}`}>
      <i className="fa-solid fa-triangle-exclamation text-red-400" />
      <span>{message}</span>
    </div>
  );
};
