import { FC } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/molecules/PageHeader";
import { SearchInput } from "../components/molecules/SearchInput";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { ArtistList } from "../components/organisms/ArtistList";
import { useArtistsController } from "../hooks/controllers/useArtistsController";

export const Artists: FC = () => {
  const { filteredArtists, isLoading, error, search, handleSearchChange, handleArtistClick } =
    useArtistsController();

  if (error) {
    return (
      <section className="flex-1 px-4 py-6 bg-background md:px-8">
        <SpotifyErrorState error={error} message="Failed to load artists." />
      </section>
    );
  }

  return (
    <section className="flex-1 px-4 pb-6 bg-background md:px-8">
      <div className="sticky top-[60px] z-30 bg-background/95 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-white/10 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-md">
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
        <ArtistList artists={filteredArtists} onClick={handleArtistClick} />
      )}
    </section>
  );
};
