import { FC } from "react";
import { useParams } from "react-router-dom";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";
import { formatDuration } from "../utils/date";

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

  const followersText =
    artist?.followers && artist.followers > 0
      ? new Intl.NumberFormat("en-US").format(artist.followers)
      : null;

  const genresText = artist?.genres && artist.genres.length > 0 ? artist.genres[0] : null;

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

            {(genresText || followersText) && (
              <p className="text-sm text-text-secondary max-w-xl">
                {genresText && <span>{genresText}</span>}
                {genresText && followersText && <span className="mx-1">•</span>}
                {followersText && <span>{followersText} followers</span>}
              </p>
            )}

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

            <div className="hidden md:grid grid-cols-[40px,minmax(0,2fr),80px] px-3 pb-1 text-xs uppercase tracking-wide text-text-secondary/80">
              <span className="text-right">#</span>
              <span className="pl-3">Title</span>
              <span className="text-right">
                <i className="fa-regular fa-clock" />
              </span>
            </div>

            <div className="space-y-1">
              {artist.topTracks.map((track, index) => (
                <div
                  key={`${track.trackUrl ?? track.name}-${index}`}
                  className="grid grid-cols-[40px,minmax(0,2fr),80px] items-center gap-3 px-3 py-2 rounded-md hover:bg-background-elevated transition-colors"
                >
                  <span className="text-sm text-text-secondary text-right">{index + 1}</span>

                  <div className="grid grid-cols-[auto,minmax(0,1fr)] gap-3 min-w-0 items-center">
                    {track.albumCoverUrl && (
                      <img
                        src={track.albumCoverUrl}
                        alt={track.album ?? track.name}
                        className="w-10 h-10 rounded-sm object-cover"
                      />
                    )}

                    <div className="grid gap-0.5 min-w-0">
                      {track.trackUrl ? (
                        <a
                          href={track.trackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-text-primary truncate hover:underline"
                          title="Open track in Spotify"
                        >
                          {track.name}
                        </a>
                      ) : (
                        <span className="text-sm text-text-primary truncate">{track.name}</span>
                      )}

                      <span className="text-xs text-text-secondary truncate">
                        {track.artists.map((artistInfo, idx) => (
                          <span key={`${artistInfo.name}-${idx}`}>
                            {idx > 0 && <span className="mx-0.5">,</span>}
                            {artistInfo.url ? (
                              <a
                                href={artistInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {artistInfo.name}
                              </a>
                            ) : (
                              <span>{artistInfo.name}</span>
                            )}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-text-secondary text-right">
                    {track.durationMs != null && track.durationMs > 0 && (
                      <span>{formatDuration(track.durationMs)}</span>
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
