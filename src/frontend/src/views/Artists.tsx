import { FC, useCallback, useMemo, useState } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { SearchInput } from "../components/molecules/SearchInput";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { ArtistList } from "../components/organisms/ArtistList";
import { useFollowedArtistsQuery } from "../hooks/queries/useFollowedArtistsQuery";
import { useDebounce } from "../hooks/useDebounce";

export const Artists: FC = () => {
  const { artists, isLoading, error } = useFollowedArtistsQuery();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const filteredArtists = useMemo(() => {
    const list = artists ?? [];
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((artist) => artist.name.toLowerCase().includes(query));
  }, [artists, debouncedSearch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  if (error) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <SpotifyErrorState error={error} message="Failed to load artists." />
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 pb-6">
      <div className="sticky top-[120px] md:top-[65px] z-30 bg-background/95 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-white/10 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-md">
        <PageHeader title="Followed Artists" />
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Filter artists..."
          className="w-full md:w-64"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : filteredArtists.length === 0 ? (
        <div className="text-text-secondary">No followed artists found.</div>
      ) : (
        <ArtistList artists={filteredArtists} />
      )}
    </section>
  );
};
