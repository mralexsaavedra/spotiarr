import { FC, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { SpotifyLinkButton } from "../components/atoms/SpotifyLinkButton";
import { ArtistHeader } from "../components/molecules/ArtistHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { TrackList } from "../components/molecules/TrackList";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";
import { useDownloadTracksQuery } from "../hooks/queries/useDownloadTracksQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useArtistStatus } from "../hooks/useArtistStatus";
import { useTrackStatus } from "../hooks/useTrackStatus";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();

  const { artist, isLoading, error } = useArtistDetailQuery(id || null);
  const { data: playlists } = usePlaylistsQuery();
  const { data: downloadTracks } = useDownloadTracksQuery();
  const createPlaylistMutation = useCreatePlaylistMutation();

  const { getTrackStatus } = useTrackStatus();
  const isArtistDownloaded = useArtistStatus(artist?.spotifyUrl, playlists, downloadTracks);
  const hasArtist = !!artist && !!id && !error;

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
      </div>
    </div>
  );
};
