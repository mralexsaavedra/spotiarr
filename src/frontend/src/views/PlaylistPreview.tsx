import { FC, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loading } from "../components/Loading";
import { PreviewActions } from "../components/PreviewActions";
import { PreviewError } from "../components/PreviewError";
import { TrackListItem } from "../components/TrackListItem";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { usePlaylistPreviewQuery } from "../hooks/queries/usePlaylistPreviewQuery";
import { PlaylistLayout } from "../layouts/PlaylistLayout";
import { Path } from "../routes/routes";
import { formatDuration } from "../utils/date";

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

  if (!spotifyUrl) {
    navigate(Path.HOME);
    return null;
  }

  if (isLoading) {
    return (
      <section className="flex-1 bg-background">
        <Loading message="Loading preview..." />
      </section>
    );
  }

  if (error || !previewData) {
    return <PreviewError error={error} onGoBack={handleGoBack} />;
  }

  return (
    <PlaylistLayout
      coverUrl={previewData.coverUrl}
      name={previewData.name}
      description={previewData.description}
      totalTracks={previewData.totalTracks}
      type="Preview"
      spotifyUrl={spotifyUrl}
      actions={
        <PreviewActions
          isDownloading={createPlaylist.isPending}
          onDownload={handleDownload}
          onGoBack={handleGoBack}
        />
      }
    >
      <div className="space-y-1">
        {previewData.tracks.map((track, index) => (
          <TrackListItem
            key={`${track.name}-${index}`}
            index={index}
            name={track.name}
            artists={track.artists.join(", ")}
            actions={
              track.duration > 0 ? (
                <span className="text-text-secondary text-sm">
                  {formatDuration(track.duration)}
                </span>
              ) : undefined
            }
          />
        ))}
      </div>
    </PlaylistLayout>
  );
};
