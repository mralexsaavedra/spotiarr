import { FC, useCallback, useMemo, MouseEvent } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";
import { formatDuration } from "../utils/date";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artist, isLoading, error } = useArtistDetailQuery(id || null);
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

  const handleTrackDownload = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const url = event.currentTarget.dataset.url;
      handleDownload(url);
    },
    [handleDownload],
  );

  const topTracksList = useMemo(() => {
    if (!artist?.topTracks) return null;

    return artist.topTracks.map((track, index) => (
      <div
        key={`${track.trackUrl ?? track.name}-${index}`}
        className="group grid grid-cols-[16px_1fr_auto] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
      >
        {/* Index / Download Icon */}
        <button
          onClick={handleTrackDownload}
          data-url={track.trackUrl}
          className="flex items-center justify-center w-4 text-base text-zinc-400 font-medium hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!track.trackUrl}
          title="Download"
        >
          <span className="group-hover:hidden">{index + 1}</span>
          <i className="hidden group-hover:block fa-solid fa-download text-white text-sm" />
        </button>

        {/* Title & Image */}
        <div className="flex items-center gap-4 min-w-0">
          {track.albumCoverUrl && (
            <img
              src={track.albumCoverUrl}
              alt={track.name}
              className="w-10 h-10 rounded shadow-sm object-cover"
            />
          )}
          <div className="flex flex-col min-w-0">
            <a
              href={track.trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-white truncate hover:underline"
            >
              {track.name}
            </a>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-end gap-4 text-sm text-zinc-400">
          <span>{track.durationMs ? formatDuration(track.durationMs) : "--:--"}</span>
        </div>
      </div>
    ));
  }, [artist?.topTracks, handleTrackDownload]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#121212] text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!hasArtist && statusMessage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#121212] text-white">
        <p className="text-zinc-400">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#121212] overflow-y-auto h-full text-white">
      {/* Header */}
      <header className="relative w-full h-[40vh] min-h-[340px] max-h-[500px]">
        {/* Background Image */}
        {artist?.image ? (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${artist.image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#121212]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-zinc-800">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212]" />
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
      <div className="px-6 md:px-8 pb-10 bg-gradient-to-b from-[#121212] to-black min-h-[50vh]">
        {/* Action Buttons */}
        <div className="flex items-center gap-4 py-6">
          {/* Download Button */}
          <Button
            variant="primary"
            size="lg"
            className="!rounded-full !px-8"
            onClick={handleArtistDownload}
            disabled={!artist?.spotifyUrl}
            icon="fa-download"
          >
            Download
          </Button>

          {/* Spotify Link Button */}
          {artist?.spotifyUrl && (
            <a
              href={artist.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button
                variant="secondary"
                size="lg"
                className="!rounded-full !px-4"
                title="Open in Spotify"
              >
                <i className="fa-brands fa-spotify text-xl" />
              </Button>
            </a>
          )}
        </div>

        {/* Popular Tracks Section */}
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Popular</h2>

          <div className="flex flex-col">{topTracksList}</div>
        </div>
      </div>
    </div>
  );
};
