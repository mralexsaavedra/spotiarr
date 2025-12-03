import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { SpotifyLinkButton } from "../components/atoms/SpotifyLinkButton";
import { ArtistHeader } from "../components/molecules/ArtistHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { ArtistDiscography } from "../components/organisms/ArtistDiscography";
import { TrackList } from "../components/organisms/TrackList";
import { useArtistDetailController } from "../hooks/controllers/useArtistDetailController";

export const ArtistDetail: FC = () => {
  const {
    id,
    artist,
    isLoading,
    error,
    hasArtist,
    isArtistDownloaded,
    followersText,
    tracks,
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
    handleArtistDownload,
    handleTrackDownload,
    handleDownload,
    handleNavigate,
    handleArtistClick,
  } = useArtistDetailController();

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-white p-6">
        <SpotifyErrorState error={error} message="Failed to load artist details." />
      </div>
    );
  }

  if (!hasArtist) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-white">
        <p className="text-text-secondary">Artist not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-black text-white">
      <ArtistHeader
        name={artist?.name || "Artist"}
        image={artist?.image}
        followersText={followersText}
        spotifyUrl={artist?.spotifyUrl}
      />

      {/* Content */}
      <div className="flex-1 px-6 md:px-8 pb-10 bg-gradient-to-b from-background to-black">
        {/* Action Buttons */}
        <div className="flex items-center gap-4 py-6">
          {/* Download Button (Circular) */}
          <Button
            variant="primary"
            size="lg"
            className={`!w-14 !h-14 !p-0 justify-center !rounded-full shadow-lg transition-transform ${
              isArtistDownloaded ? "bg-green-500 hover:bg-green-600" : "hover:scale-105"
            }`}
            onClick={handleArtistDownload}
            disabled={!artist?.spotifyUrl || isArtistDownloaded}
            title={isArtistDownloaded ? "Artist Downloaded" : "Download All"}
          >
            {isArtistDownloaded ? (
              <FontAwesomeIcon icon="check" className="text-xl" />
            ) : (
              <FontAwesomeIcon icon="download" className="text-xl" />
            )}
          </Button>

          {/* Spotify Link Button (Pill) */}
          {artist?.spotifyUrl && <SpotifyLinkButton url={artist.spotifyUrl} />}
        </div>

        {/* Popular Tracks Section */}
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Popular</h2>

          {!tracks || tracks.length === 0 ? (
            <EmptyState
              icon="music"
              title="No tracks found"
              description="This artist has no popular tracks available."
              className="py-8"
            />
          ) : (
            <TrackList tracks={tracks} onDownload={handleTrackDownload} />
          )}
        </div>

        {/* Discography Section */}
        {artist?.albums && artist.albums.length > 0 ? (
          <ArtistDiscography
            artistId={id!}
            albums={artist.albums}
            filter={filter}
            onFilterChange={setFilter}
            filteredAlbums={filteredAlbums}
            visibleItems={visibleItems}
            isLoadingMore={isLoadingMore}
            onShowMore={handleShowMore}
            canShowMore={canShowMore}
            onDownload={handleDownload}
            onDiscographyItemClick={handleNavigate}
            onArtistClick={handleArtistClick}
          />
        ) : (
          <div className="mt-10 text-center text-text-secondary">
            <p>No discography available.</p>
          </div>
        )}
      </div>
    </div>
  );
};
