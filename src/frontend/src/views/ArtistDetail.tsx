import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Loading } from "../components/atoms/Loading";
import { SpotifyLinkButton } from "../components/atoms/SpotifyLinkButton";
import { ArtistHeader } from "../components/molecules/ArtistHeader";
import { EmptyState } from "../components/molecules/EmptyState";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { ArtistDiscography } from "../components/organisms/ArtistDiscography";
import { TrackList } from "../components/organisms/TrackList";
import { useDownloadStatusContext } from "../contexts/DownloadStatusContext";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";
import { useGridColumns } from "../hooks/useGridColumns";
import { Path } from "../routes/routes";
import { Track } from "../types/track";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const columns = useGridColumns();
  const limit = columns * 2;

  const { artist, isLoading, error } = useArtistDetailQuery(id || null, limit);
  const createPlaylistMutation = useCreatePlaylistMutation();

  const { isPlaylistDownloaded } = useDownloadStatusContext();
  const isArtistDownloaded = isPlaylistDownloaded(artist?.spotifyUrl);
  const hasArtist = !!artist && !!id && !error;

  const followersText = useMemo(
    () =>
      artist?.followers && artist.followers > 0
        ? new Intl.NumberFormat("en-US").format(artist.followers)
        : null,
    [artist?.followers],
  );

  const tracks: Track[] = useMemo(() => {
    if (!artist?.topTracks) return [];
    return artist.topTracks.map((t, i) => ({
      id: `top-${i}`,
      name: t.name,
      artist: artist.name,
      artists: [{ name: artist.name, url: artist.spotifyUrl || "" }],
      album: "", // Top tracks don't always have album info here
      durationMs: t.durationMs,
      status: TrackStatusEnum.New,
      trackUrl: t.trackUrl,
      albumUrl: t.albumCoverUrl,
    }));
  }, [artist]);

  const handleDownload = useCallback(
    (url?: string) => {
      if (!url) {
        return;
      }

      createPlaylistMutation.mutate(url);
    },
    [createPlaylistMutation],
  );

  const handleTrackDownload = useCallback(
    (track: Track) => {
      if (track.trackUrl) {
        handleDownload(track.trackUrl);
      }
    },
    [handleDownload],
  );

  const handleArtistDownload = useCallback(() => {
    handleDownload(artist?.spotifyUrl || undefined);
  }, [handleDownload, artist?.spotifyUrl]);

  const handleNavigate = useCallback(
    (url: string) => {
      navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(url)}`);
    },
    [navigate],
  );

  const handleArtistClick = useCallback(
    (artistId: string) => {
      if (artistId !== id) {
        navigate(Path.ARTIST_DETAIL.replace(":id", artistId));
      }
    },
    [navigate, id],
  );

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
            onDownload={handleDownload}
            onDiscographyItemClick={handleNavigate}
            onArtistClick={handleArtistClick}
            pageSize={limit}
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
