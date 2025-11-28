import { FC, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
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
      artist: t.artists.join(", "),
      artists: t.artists.map((a) => ({ name: a })),
      album: t.album,
      durationMs: t.duration,
      status: TrackStatus.New,
    }));
  }, [previewData]);

  const handleRetryTrack = useCallback(() => {
    // No-op for preview
  }, []);

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
    <div className="flex-1 bg-background overflow-y-auto h-full text-text-primary">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-800/80 to-background px-6 md:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Cover Image */}
          <div className="w-48 h-48 md:w-60 md:h-60 shadow-2xl flex-shrink-0">
            {previewData.coverUrl ? (
              <img
                src={previewData.coverUrl}
                alt={previewData.name}
                className="w-full h-full object-cover shadow-lg"
              />
            ) : (
              <div className="w-full h-full bg-background-elevated flex items-center justify-center">
                <i className="fa-solid fa-music text-6xl text-text-secondary" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 space-y-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Preview
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-md break-words">
              {previewData.name}
            </h1>
            {previewData.description && (
              <p className="text-text-secondary text-sm font-medium mt-4 line-clamp-2">
                {previewData.description}
              </p>
            )}

            <div className="flex items-center gap-1 text-sm font-medium text-text-primary mt-2">
              <span className="font-bold">SpotiArr</span>
              <span className="text-text-secondary">•</span>
              <span className="text-text-secondary">{previewData.totalTracks} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-8 py-6 bg-gradient-to-b from-black/20 to-background">
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
      </div>

      {/* Tracks List */}
      <div className="px-6 md:px-8 pb-8">
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
      </div>
    </div>
  );
};
