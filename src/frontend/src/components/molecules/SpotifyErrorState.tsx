import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApiErrorCode } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { cn } from "../../utils/cn";
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
    <div className={cn("flex flex-1 items-center justify-center", className)}>
      <ConnectSpotifyPrompt onConnect={onConnect} />
    </div>
  ),
  spotify_rate_limited: ({ className }) => (
    <div
      className={cn("text-text-secondary flex flex-1 items-center justify-center gap-2", className)}
    >
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

  // Fix: map outdated backend error code to frontend constant if needed, or assume literal match
  // The backend uses 'MISSING_SPOTIFY_USER_TOKEN' but types/shared might have 'missing_spotify_user_token'
  // Assuming keys in ERROR_RENDERERS match ApiErrorCode values.
  const Renderer = ERROR_RENDERERS[error];

  if (Renderer) {
    return <Renderer className={className} onConnect={handleConnectSpotify} />;
  }

  return (
    <div className={cn("text-text-secondary flex items-center gap-2", className)}>
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-400" />
      <span>{message}</span>
    </div>
  );
};
