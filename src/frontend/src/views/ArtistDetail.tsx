import { FC } from "react";
import { useParams } from "react-router-dom";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artist, isLoading, error } = useArtistDetailQuery(id || null);

  const hasArtist = !!artist && !!id && !error;

  const statusMessage =
    error === "missing_user_access_token"
      ? "Connect Spotify to view artist details."
      : error === "spotify_rate_limited"
        ? "Spotify rate limited. Please try again later."
        : error
          ? "Failed to load artist details."
          : undefined;

  const isEmptyState = !hasArtist && !isLoading && !!statusMessage;

  return (
    <section className="flex-1 bg-background overflow-y-auto">
      <header className="relative h-52 sm:h-64 md:h-80 lg:h-96">
        {artist?.image && (
          <img
            src={artist.image}
            alt={artist.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />

        <div className="relative h-full px-4 md:px-8 pb-6 md:pb-10 flex items-end">
          <div className="space-y-2 min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white break-words">
              {artist?.name || "Artist"}
            </h1>

            {statusMessage && (
              <p className="text-sm text-text-secondary max-w-xl">{statusMessage}</p>
            )}

            {artist?.spotifyUrl && (
              <div className="pt-2">
                <a
                  href={artist.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-sm font-medium text-white hover:bg-primary-light transition-colors"
                >
                  <i className="fa-brands fa-spotify" />
                  <span>Open in Spotify</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 py-4 md:py-6">
        {isLoading && !artist && !error && (
          <p className="text-sm text-text-secondary">Loading artist details...</p>
        )}

        {isEmptyState && <p className="text-sm text-text-secondary">{statusMessage}</p>}

        {hasArtist && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">Popular</h2>

            <div className="space-y-1">
              {artist.topTracks.map((track, index) => (
                <div
                  key={`${track.trackUrl ?? track.name}-${index}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-background-elevated transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-text-secondary w-6 text-right">{index + 1}</span>

                    {track.albumCoverUrl && (
                      <img
                        src={track.albumCoverUrl}
                        alt={track.album ?? track.name}
                        className="w-10 h-10 rounded-sm object-cover flex-shrink-0"
                      />
                    )}

                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-text-primary truncate">{track.name}</span>
                      <span className="text-xs text-text-secondary truncate">{track.artist}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    {track.album && (
                      <span className="hidden sm:inline text-xs text-text-secondary truncate max-w-[160px]">
                        {track.album}
                      </span>
                    )}
                    {track.trackUrl && (
                      <a
                        href={track.trackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-light transition-colors text-sm"
                        title="Open track in Spotify"
                      >
                        <i className="fa-brands fa-spotify" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};
