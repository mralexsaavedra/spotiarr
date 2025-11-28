import { FC, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DetailLayout } from "../components/layouts/DetailLayout";
import { PreviewActions } from "../components/molecules/PreviewActions";
import { PreviewError } from "../components/molecules/PreviewError";
import { TrackListItem } from "../components/molecules/TrackListItem";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { usePlaylistPreviewQuery } from "../hooks/queries/usePlaylistPreviewQuery";
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

  useEffect(() => {
    if (!spotifyUrl) {
      navigate(Path.HOME);
    }
  }, [spotifyUrl, navigate]);

  if (!spotifyUrl) {
    return null;
  }

  if (error || (!previewData && !isLoading)) {
    return <PreviewError error={error} onGoBack={handleGoBack} />;
  }

  return (
    <DetailLayout
      imageUrl={previewData?.coverUrl ?? null}
      fallbackIconClass="fa-solid fa-music"
      imageShape="square"
      typeLabel="Preview"
      title={previewData?.name || "Preview"}
      description={previewData?.description}
      meta={
        previewData && (
          <span>
            {previewData.totalTracks} {previewData.totalTracks === 1 ? "track" : "tracks"}
          </span>
        )
      }
      spotifyUrl={spotifyUrl}
      actions={
        <PreviewActions
          isDownloading={createPlaylist.isPending}
          onDownload={handleDownload}
          onGoBack={handleGoBack}
        />
      }
      isLoading={isLoading}
      emptyMessage={isLoading ? "Loading preview..." : undefined}
    >
      {previewData && (
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
      )}
    </DetailLayout>
  );
};
