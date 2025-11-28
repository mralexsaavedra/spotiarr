import { FC, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { TrackList } from "../components/molecules/TrackList";
import { ArtistDetailSkeleton } from "../components/skeletons/ArtistDetailSkeleton";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";
import { useDownloadTracksQuery } from "../hooks/queries/useDownloadTracksQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artist, isLoading, error } = useArtistDetailQuery(id || null);
  const { data: playlists } = usePlaylistsQuery();
  const { data: downloadTracks } = useDownloadTracksQuery();
  const createPlaylistMutation = useCreatePlaylistMutation();

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

  const isArtistDownloaded = useMemo(() => {
    if (!artist?.spotifyUrl) return false;
    const url = artist.spotifyUrl;

    // Check active playlists
    const isActive = playlists?.some((p) => p.spotifyUrl === url);
    if (isActive) return true;

    // Check history (if artist was downloaded as a playlist)
    // Note: downloadTracks contains individual tracks, but we can check if any track belongs to a playlist with this URL
    const isHistory = downloadTracks?.some((t) => t.playlistSpotifyUrl === url);
    return !!isHistory;
  }, [artist?.spotifyUrl, playlists, downloadTracks]);

  const isTrackDownloaded = useCallback(
    (url: string) => {
      // Check active playlists
      const isActive = playlists?.some((p) => p.tracks?.some((t) => t.trackUrl === url));
      if (isActive) return true;

      // Check history
      const isHistory = downloadTracks?.some((t) => t.trackUrl === url);
      return !!isHistory;
    },
    [playlists, downloadTracks],
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
    return <ArtistDetailSkeleton />;
  }

  if (!hasArtist && statusMessage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#121212] text-white">
        <p className="text-zinc-400">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto h-full text-white">
      {/* Header */}
      <header className="relative w-full h-[40vh] min-h-[340px] max-h-[500px]">
        {/* Background Image */}
        {artist?.image ? (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${artist.image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-background" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-zinc-800">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-10">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 drop-shadow-lg">
            {artist?.name || "Artist"}
          </h1>

          {followersText && (
            <p className="text-base font-medium drop-shadow-md">{followersText} followers</p>
          )}
        </div>
      </header>

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
          {artist?.spotifyUrl && (
            <a
              href={artist.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button
                variant="secondary"
                size="md"
                className="!rounded-full !px-6 border border-zinc-600 hover:border-white"
                icon="fa-brands fa-spotify"
              >
                Open in Spotify
              </Button>
            </a>
          )}
        </div>

        {/* Popular Tracks Section */}
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Popular</h2>

          <TrackList
            tracks={artist?.topTracks || []}
            onDownload={handleDownload}
            isTrackDownloaded={isTrackDownloaded}
          />
        </div>
      </div>
    </div>
  );
};
