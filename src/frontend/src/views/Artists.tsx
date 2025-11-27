import { FC, ChangeEventHandler, useCallback, useMemo, useState } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { ArtistCard } from "../components/organisms/ArtistCard";
import { ConnectSpotifyPrompt } from "../components/organisms/ConnectSpotifyPrompt";
import { useFollowedArtistsQuery } from "../hooks/queries/useFollowedArtistsQuery";

export const Artists: FC = () => {
  const { artists, isLoading, error } = useFollowedArtistsQuery();
  const [search, setSearch] = useState("");

  const filteredArtists = useMemo(() => {
    const list = artists ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((artist) => artist.name.toLowerCase().includes(query));
  }, [artists, search]);

  const handleConnectSpotify = useCallback(() => {
    window.location.href = "/api/auth/spotify/login";
  }, []);

  const handleSearchChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    setSearch(event.target.value);
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

  if (error || filteredArtists.length === 0) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <PageHeader title="Followed Artists" />
        </div>
        <div className="text-text-secondary">No followed artists found.</div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="md:-mb-6">
          <PageHeader title="Followed Artists" />
        </div>
        <div className="w-full md:w-64">
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search artists..."
            className="w-full rounded-md bg-background-elevated border border-border px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filteredArtists.map((artist) => (
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
