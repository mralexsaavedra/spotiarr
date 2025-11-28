import { FC, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { DetailLayout } from "../components/layouts/DetailLayout";
import { PreviewError } from "../components/molecules/PreviewError";
import { PlaylistTracksList } from "../components/organisms/PlaylistTracksList";
import { PlaylistDetailSkeleton } from "../components/skeletons/PlaylistDetailSkeleton";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { usePlaylistPreviewQuery } from "../hooks/queries/usePlaylistPreviewQuery";
import { Path } from "../routes/routes";
import { Track, TrackStatus } from "../types/track";

export const PlaylistPreview: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const createPlaylist = useCreatePlaylistMutation();

  const spotifyUrl = useMemo(() => searchParams.get("url"), [searchParams]);

  const { data: previewData, isLoading, error } = usePlaylistPreviewQuery(spotifyUrl);

  const handleGoBack = useCallback(() => {
    navigate(Path.RELEASES);
  }, [navigate]);

  const handleDownload = useCallback(() => {
    if (!spotifyUrl) return;

    createPlaylist.mutate(spotifyUrl, {
      onSuccess: () => {
        navigate(Path.HOME);
      },
    });
  }, [spotifyUrl, createPlaylist, navigate]);

  useEffect(() => {
    if (!spotifyUrl) {
      navigate(Path.HOME);
    }
  }, [spotifyUrl, navigate]);

  const tracks: Track[] = useMemo(() => {
    if (!previewData?.tracks) return [];
    return previewData.tracks.map((t, i) => ({
      id: `preview-${i}`,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      artists: t.artists.map((a) => ({ name: a.name, url: a.url })),
      album: t.album,
      durationMs: t.duration,
      status: TrackStatus.New,
      trackUrl: t.trackUrl,
      albumUrl: t.albumUrl,
    }));
  }, [previewData]);

  const handleRetryTrack = useCallback(() => {
    // No-op for preview
  }, []);

  const displayTitle = useMemo(() => {
    if (!previewData) return "Preview";

    if (previewData.type === "album") {
      if (previewData.tracks.length > 0 && previewData.tracks[0].album) {
        return previewData.tracks[0].album;
      }
      const parts = (previewData.name || "").split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : previewData.name;
    }

    if (previewData.type === "track") {
      if (previewData.tracks.length > 0 && previewData.tracks[0].name) {
        return previewData.tracks[0].name;
      }
      const parts = (previewData.name || "").split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : previewData.name;
    }

    return previewData.name;
  }, [previewData]);

  const renderMetadata = useMemo(() => {
    if (!previewData) return null;

    const firstTrack = previewData.tracks[0];
    // previewData.tracks already has artists as objects {name, url}
    const artists = firstTrack?.artists || [];

    const renderArtists = () => (
      <span className="font-bold text-white">
        {artists.map((artist, i) => (
          <span key={`${artist.name}-${i}`}>
            {artist.url ? (
              <a
                href={artist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {artist.name}
              </a>
            ) : (
              artist.name
            )}
            {i < artists.length - 1 && ", "}
          </span>
        ))}
      </span>
    );

    if (previewData.type === "album" && artists.length > 0) {
      return renderArtists();
    }

    if (previewData.type === "track" && artists.length > 0) {
      return (
        <>
          {renderArtists()}
          <span className="text-text-primary">•</span>
          {firstTrack?.albumUrl ? (
            <a
              href={firstTrack.albumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white hover:underline transition-colors"
            >
              {firstTrack?.album || "Unknown Album"}
            </a>
          ) : (
            <span className="font-medium text-white">{firstTrack?.album || "Unknown Album"}</span>
          )}
        </>
      );
    }

    return <span className="font-bold">SpotiArr</span>;
  }, [previewData]);

  if (!spotifyUrl) {
    return null;
  }

  if (isLoading) {
    return <PlaylistDetailSkeleton />;
  }

  if (error || !previewData) {
    return <PreviewError error={error} onGoBack={handleGoBack} />;
  }

  return (
    <DetailLayout
      imageUrl={previewData.coverUrl || null}
      fallbackIconClass="fa-solid fa-music"
      typeLabel={previewData.type}
      title={displayTitle}
      description={previewData.description}
      meta={
        <>
          {renderMetadata}
          <span className="text-text-secondary">•</span>
          <span className="text-text-secondary">{previewData.totalTracks} songs</span>
        </>
      }
      actions={
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            className="!w-14 !h-14 !p-0 justify-center !rounded-full shadow-lg bg-green-500 hover:bg-green-600 hover:scale-105 transition-transform"
            onClick={handleDownload}
            loading={createPlaylist.isPending}
            title="Download Playlist"
          >
            <i className="fa-solid fa-download text-xl" />
          </Button>

          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
            <Button
              variant="secondary"
              size="md"
              className="!rounded-full !px-6 border border-zinc-600 hover:border-white"
              icon="fa-brands fa-spotify"
            >
              Open in Spotify
            </Button>
          </a>
        </div>
      }
    >
      {/* Table Header */}
      <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 px-4 py-2 border-b border-white/10 text-text-secondary text-sm uppercase tracking-wider mb-4 sticky top-0 bg-background z-10">
        <div className="text-center">#</div>
        <div>Title</div>
        <div className="hidden md:block">Album</div>
        <div className="text-right">
          <i className="fa-regular fa-clock" />
        </div>
      </div>

      <PlaylistTracksList tracks={tracks} onRetryTrack={handleRetryTrack} />
    </DetailLayout>
  );
};
