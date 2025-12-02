import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { SpotifyLinkButton } from "../components/atoms/SpotifyLinkButton";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { PreviewError } from "../components/molecules/PreviewError";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { PlaylistView } from "../components/templates/PlaylistView";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { usePlaylistPreviewQuery } from "../hooks/queries/usePlaylistPreviewQuery";
import { useDownloadStatus } from "../hooks/useDownloadStatus";
import { Path } from "../routes/routes";
import { Track } from "../types/track";

export const PlaylistPreview: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const createPlaylist = useCreatePlaylistMutation();
  const { isPlaylistDownloaded, isPlaylistDownloading, getTrackStatus } = useDownloadStatus();

  const spotifyUrl = useMemo(() => searchParams.get("url"), [searchParams]);
  const { data: previewData, isLoading, error } = usePlaylistPreviewQuery(spotifyUrl);

  const isDownloaded = isPlaylistDownloaded(spotifyUrl);
  const isDownloading = isPlaylistDownloading(spotifyUrl);

  const tracks: Track[] = useMemo(() => {
    if (!previewData?.tracks) return [];

    return previewData.tracks.map((t, i) => {
      const status = t.trackUrl ? getTrackStatus(t.trackUrl) : undefined;

      return {
        id: `preview-${i}`,
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        artists: t.artists.map((a) => ({ name: a.name, url: a.url })),
        album: t.album,
        durationMs: t.duration,
        status: status || TrackStatusEnum.New,
        trackUrl: t.trackUrl,
        albumUrl: t.albumUrl,
      };
    });
  }, [previewData, getTrackStatus]);

  const handleGoBack = useCallback(() => {
    navigate(Path.RELEASES);
  }, [navigate]);

  const handleDownload = useCallback(() => {
    if (!spotifyUrl) return;

    createPlaylist.mutate(spotifyUrl);
  }, [spotifyUrl, createPlaylist]);

  const handleDownloadTrack = useCallback(
    (track: Track) => {
      if (track.trackUrl) {
        createPlaylist.mutate(track.trackUrl);
      }
    },
    [createPlaylist],
  );

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  if (!spotifyUrl) {
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  if (isLoading) {
    return <PlaylistSkeleton />;
  }

  if (error) {
    return <PreviewError error={error} onGoBack={handleGoBack} />;
  }

  return (
    <PlaylistView
      title={previewData?.name || "Preview"}
      type={previewData?.type || "preview"}
      coverUrl={previewData?.coverUrl || null}
      description={previewData?.description}
      actions={
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            className={`!w-14 !h-14 !p-0 justify-center !rounded-full shadow-lg transition-transform ${
              isDownloaded
                ? "bg-green-500 hover:bg-green-600 cursor-default"
                : "bg-green-500 hover:bg-green-600 hover:scale-105"
            }`}
            onClick={handleDownload}
            loading={createPlaylist.isPending || isDownloading}
            disabled={isDownloaded || isDownloading || createPlaylist.isPending}
            title={
              isDownloaded ? "Downloaded" : isDownloading ? "Downloading..." : "Download Playlist"
            }
          >
            {isDownloaded ? (
              <FontAwesomeIcon icon="check" className="text-xl" />
            ) : !(isDownloading || createPlaylist.isPending) ? (
              <FontAwesomeIcon icon="download" className="text-xl" />
            ) : null}
          </Button>

          <SpotifyLinkButton url={spotifyUrl} />
        </div>
      }
      tracks={tracks}
      onDownloadTrack={handleDownloadTrack}
    />
  );
};
