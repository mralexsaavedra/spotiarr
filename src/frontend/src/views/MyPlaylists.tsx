import { ApiErrorCode } from "@spotiarr/shared";
import { FC } from "react";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/molecules/PageHeader";
import { SearchInput } from "../components/molecules/SearchInput";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { SpotifyPlaylistList } from "../components/organisms/SpotifyPlaylistList";
import { useMyPlaylistsController } from "../hooks/controllers/useMyPlaylistsController";
import { ApiError } from "../services/httpClient";

export const MyPlaylists: FC = () => {
  const { filteredPlaylists, isLoading, error, search, handleSearchChange, handlePlaylistClick } =
    useMyPlaylistsController();

  if (error) {
    const apiError = error instanceof ApiError ? error : null;
    const errorCode = (apiError?.code || "unknown_error") as ApiErrorCode;

    return (
      <section className="flex-1 px-4 py-6 bg-background md:px-8">
        <SpotifyErrorState
          error={errorCode}
          message="Failed to load your playlists from Spotify."
        />
      </section>
    );
  }

  return (
    <section className="flex-1 px-4 pb-6 bg-background md:px-8">
      <div className="sticky top-[60px] z-30 bg-background/95 backdrop-blur-md py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-white/10 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-md">
        <PageHeader title="My Spotify Playlists" />
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Filter playlists..."
          className="w-full md:w-64"
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : filteredPlaylists.length === 0 ? (
        <div className="text-text-secondary">No playlists found.</div>
      ) : (
        <SpotifyPlaylistList playlists={filteredPlaylists} onClick={handlePlaylistClick} />
      )}
    </section>
  );
};
