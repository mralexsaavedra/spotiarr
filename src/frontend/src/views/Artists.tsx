import { FC, useCallback } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { ConnectSpotifyPrompt } from "../components/organisms/ConnectSpotifyPrompt";
import { useFollowedArtistsQuery } from "../hooks/queries/useFollowedArtistsQuery";

export const Artists: FC = () => {
  const { artists, isLoading, error } = useFollowedArtistsQuery();

  const handleConnectSpotify = useCallback(() => {
    window.location.href = "/api/auth/spotify/login";
  }, []);

  if (isLoading) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="Followed Artists" />
        <Loading message="Loading artists..." />
      </section>
    );
  }

  if (error === "missing_user_access_token") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <ConnectSpotifyPrompt onConnect={handleConnectSpotify} />
      </section>
    );
  }

  if (error === "spotify_rate_limited") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="Followed Artists" />
        <div className="text-text-secondary flex items-center gap-2">
          <i className="fa-solid fa-hourglass-half" /> Spotify rate limited. Please try again later.
        </div>
      </section>
    );
  }

  if (error || !artists || artists.length === 0) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="Followed Artists" />
        <div className="text-text-secondary">No followed artists found.</div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <PageHeader title="Followed Artists" />
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {artists.map((artist) => (
          <article
            key={artist.id}
            className="group bg-background-elevated hover:bg-background-hover rounded-md p-4 transition-all cursor-pointer flex flex-col items-center text-center"
            onClick={() => {
              if (artist.spotifyUrl) {
                window.open(artist.spotifyUrl, "_blank", "noopener,noreferrer");
              }
            }}
          >
            <div className="relative w-24 h-24 mb-3 rounded-full overflow-hidden bg-background-hover shadow-lg">
              {artist.image ? (
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fa-solid fa-user text-3xl text-text-secondary" />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-sm text-text-primary truncate w-full">
              {artist.name}
            </h3>
            {artist.spotifyUrl && (
              <button
                type="button"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(artist.spotifyUrl || "", "_blank", "noopener,noreferrer");
                }}
              >
                <i className="fa-brands fa-spotify" />
                <span>Open in Spotify</span>
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};
