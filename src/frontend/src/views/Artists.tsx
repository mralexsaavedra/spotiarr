import { FC, useCallback } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { ArtistCard } from "../components/organisms/ArtistCard";
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
          <ArtistCard
            key={artist.id}
            id={artist.id}
            name={artist.name}
            image={artist.image}
            spotifyUrl={artist.spotifyUrl}
          />
        ))}
      </div>
    </section>
  );
};
