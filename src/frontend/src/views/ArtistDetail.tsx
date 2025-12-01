import { FC, useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { SpotifyLinkButton } from "../components/atoms/SpotifyLinkButton";
import { ArtistHeader } from "../components/molecules/ArtistHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { ReleaseCard } from "../components/organisms/ReleaseCard";
import { TrackList } from "../components/organisms/TrackList";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";
import { useDownloadTracksQuery } from "../hooks/queries/useDownloadTracksQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useArtistStatus } from "../hooks/useArtistStatus";
import { useTrackStatus } from "../hooks/useTrackStatus";

const FilterButton: FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
      active ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
    }`}
  >
    {label}
  </button>
);

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const [filter, setFilter] = useState<"popular" | "album" | "single" | "compilation">("popular");

  const { artist, isLoading, error } = useArtistDetailQuery(id || null);
  const { data: playlists } = usePlaylistsQuery();
  const { data: downloadTracks } = useDownloadTracksQuery();
  const createPlaylistMutation = useCreatePlaylistMutation();

  const { getTrackStatus } = useTrackStatus();
  const isArtistDownloaded = useArtistStatus(artist?.spotifyUrl, playlists, downloadTracks);
  const hasArtist = !!artist && !!id && !error;

  const filteredAlbums = useMemo(() => {
    if (!artist?.albums) return [];

    let result = artist.albums;

    if (filter !== "popular") {
      result = result.filter((a) => a.albumType === filter);
    }

    // Sort by release date desc
    return [...result].sort((a, b) => {
      const dateA = a.releaseDate || "";
      const dateB = b.releaseDate || "";
      return dateB.localeCompare(dateA);
    });
  }, [artist?.albums, filter]);

  const statusMessage = useMemo(
    () =>
      error === "missing_user_access_token"
        ? "Connect Spotify to view artist details."
        : error === "spotify_rate_limited"
          ? "Spotify rate limited. Please try again later."
          : error
            ? "Failed to load artist details."
            : undefined,
    [error],
  );

  const followersText = useMemo(
    () =>
      artist?.followers && artist.followers > 0
        ? new Intl.NumberFormat("en-US").format(artist.followers)
        : null,
    [artist?.followers],
  );

  const handleDownload = useCallback(
    (url?: string) => {
      if (!url) return;
      createPlaylistMutation.mutate(url);
    },
    [createPlaylistMutation],
  );

  const handleArtistDownload = useCallback(() => {
    handleDownload(artist?.spotifyUrl || undefined);
  }, [handleDownload, artist?.spotifyUrl]);

  if (isLoading) {
    return <Loading />;
  }

  if (!hasArtist && statusMessage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-white">
        <p className="text-text-secondary">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto h-full text-white">
      <ArtistHeader
        name={artist?.name || "Artist"}
        image={artist?.image}
        followersText={followersText}
      />

      {/* Action Bar & Content */}
      <div className="px-6 md:px-8 pb-10 bg-gradient-to-b from-background to-black min-h-[50vh]">
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
              <i className="fa-solid fa-check text-xl" />
            ) : (
              <i className="fa-solid fa-download text-xl" />
            )}
          </Button>

          {/* Spotify Link Button (Pill) */}
          {artist?.spotifyUrl && <SpotifyLinkButton url={artist.spotifyUrl} />}
        </div>

        {/* Popular Tracks Section */}
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Popular</h2>

          {!artist?.topTracks || artist.topTracks.length === 0 ? (
            <EmptyState
              icon="fa-music"
              title="No tracks found"
              description="This artist has no popular tracks available."
              className="py-8"
            />
          ) : (
            <TrackList
              tracks={artist.topTracks}
              onDownload={handleDownload}
              getTrackStatus={getTrackStatus}
            />
          )}
        </div>

        {/* Discography Section */}
        {artist?.albums && artist.albums.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Discography</h2>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <FilterButton
                active={filter === "popular"}
                onClick={() => setFilter("popular")}
                label="Popular releases"
              />
              <FilterButton
                active={filter === "album"}
                onClick={() => setFilter("album")}
                label="Albums"
              />
              <FilterButton
                active={filter === "single"}
                onClick={() => setFilter("single")}
                label="Singles & EPs"
              />
              <FilterButton
                active={filter === "compilation"}
                onClick={() => setFilter("compilation")}
                label="Compilations"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredAlbums.slice(0, 12).map((album) => (
                <ReleaseCard
                  key={album.albumId}
                  albumId={album.albumId}
                  artistId={album.artistId}
                  albumName={album.albumName}
                  artistName={album.artistName}
                  coverUrl={album.coverUrl}
                  releaseDate={album.releaseDate}
                  spotifyUrl={album.spotifyUrl}
                  isDownloaded={false} // TODO: Check status
                  isDownloading={false} // TODO: Check status
                  albumType={album.albumType}
                  onCardClick={() => {}} // TODO: Navigate
                  onDownloadClick={(e) => {
                    e.stopPropagation();
                    handleDownload(album.spotifyUrl);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
