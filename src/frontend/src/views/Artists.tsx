import { FC, ChangeEventHandler, useCallback, useMemo, useState } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { SearchInput } from "../components/molecules/SearchInput";
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

  if (error === "missing_user_access_token") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <ConnectSpotifyPrompt onConnect={handleConnectSpotify} />
      </section>
    );
  }
  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="md:-mb-6">
          <PageHeader title="Followed Artists" />
        </div>
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search artists..."
          className="w-full md:w-64"
        />
      </div>

      {isLoading ? (
        <Loading message="Loading artists..." />
      ) : error === "spotify_rate_limited" ? (
        <div className="text-text-secondary flex items-center gap-2">
          <i className="fa-solid fa-hourglass-half" /> Spotify rate limited. Please try again later.
        </div>
      ) : error ? (
        <div className="text-text-secondary">Failed to load artists. Please try again later.</div>
      ) : filteredArtists.length === 0 ? (
        <div className="text-text-secondary">No followed artists found.</div>
      ) : (
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
      )}
    </section>
  );
};
