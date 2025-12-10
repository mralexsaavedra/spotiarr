import { FC } from "react";
import { useSpotifyAuthController } from "../../hooks/controllers/useSpotifyAuthController";
import { Button } from "../atoms/Button";
import { SpotifyAuthCardSkeleton } from "../skeletons/SpotifyAuthCardSkeleton";

export const SpotifyAuthCard: FC = () => {
  const { isAuthenticated, isLoading, login, logout } = useSpotifyAuthController();

  if (isLoading) {
    return <SpotifyAuthCardSkeleton />;
  }

  return (
    <div className="p-6 space-y-4 border rounded-lg bg-background-elevated border-white/10">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Spotify Authentication
          </h2>
          <p className="text-sm text-text-secondary">
            {isAuthenticated
              ? "You're connected to Spotify. This allows access to your playlists and Spotify-created playlists."
              : "Connect your Spotify account to access your personal playlists and Spotify-created playlists (like 'Made For You')."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 text-green-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {isAuthenticated ? (
          <Button type="button" onClick={logout} disabled={isLoading} variant="secondary" size="md">
            Disconnect Spotify
          </Button>
        ) : (
          <Button
            type="button"
            onClick={login}
            disabled={isLoading}
            variant="primary"
            size="md"
            loading={isLoading}
            icon={["fab", "spotify"]}
          >
            Connect with Spotify
          </Button>
        )}
      </div>

      {!isAuthenticated && (
        <div className="p-4 mt-4 border rounded-lg bg-blue-500/10 border-blue-500/20">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-400">Why connect?</p>
              <ul className="space-y-1 text-xs text-blue-300 list-disc list-inside">
                <li>Access Spotify editorial playlists (e.g., "Top 50", "Discover Weekly")</li>
                <li>Import your personal and collaborative playlists</li>
                <li>Sync your followed artists for new releases</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
