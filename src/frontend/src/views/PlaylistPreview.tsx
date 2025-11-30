import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { SpotifyLinkButton } from "../components/atoms/SpotifyLinkButton";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { PlaylistView } from "../components/templates/PlaylistView";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useDownloadTracksQuery } from "../hooks/queries/useDownloadTracksQuery";
import { usePlaylistPreviewQuery } from "../hooks/queries/usePlaylistPreviewQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { Path } from "../routes/routes";
import { Track } from "../types/track";

export const PlaylistPreview: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const createPlaylist = useCreatePlaylistMutation();

  const spotifyUrl = useMemo(() => searchParams.get("url"), [searchParams]);

  const { data: previewData, isLoading, error } = usePlaylistPreviewQuery(spotifyUrl);
  const { data: playlists } = usePlaylistsQuery();
  const { data: downloadTracks } = useDownloadTracksQuery();

  const handleGoBack = useCallback(() => {
    navigate(Path.RELEASES);
  }, [navigate]);

  const handleDownload = useCallback(() => {
    if (!spotifyUrl) return;

    createPlaylist.mutate(spotifyUrl);
  }, [spotifyUrl, createPlaylist]);

  const tracks: Track[] = useMemo(() => {
    if (!previewData?.tracks) return [];

    return previewData.tracks.map((t, i) => {
      let status = "new" as TrackStatusEnum;

      const activePlaylist = playlists?.find((p) =>
        p.tracks?.some((at) => at.trackUrl === t.trackUrl),
      );
      if (activePlaylist) {
        const activeTrack = activePlaylist.tracks?.find((at) => at.trackUrl === t.trackUrl);
        if (activeTrack) {
          status = activeTrack.status;
        }
      } else {
        const isHistory = downloadTracks?.some((dt) => dt.trackUrl === t.trackUrl);
        if (isHistory) {
          status = "completed" as TrackStatusEnum;
        }
      }

      return {
        id: `preview-${i}`,
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        artists: t.artists.map((a) => ({ name: a.name, url: a.url })),
        album: t.album,
        durationMs: t.duration,
        status: status,
        trackUrl: t.trackUrl,
        albumUrl: t.albumUrl,
      };
    });
  }, [previewData, playlists, downloadTracks]);

  const handleRetryTrack = useCallback(() => {
    // No-op for preview
  }, []);

  const handleDownloadTrack = useCallback(
    (track: Track) => {
      if (track.trackUrl) {
        createPlaylist.mutate(track.trackUrl);
      }
    },
    [createPlaylist],
  );

  if (!spotifyUrl) {
    return <PlaylistNotFound onGoHome={() => navigate(Path.HOME)} />;
  }

  if (isLoading) {
    return <PlaylistSkeleton />;
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
            className="!w-14 !h-14 !p-0 justify-center !rounded-full shadow-lg bg-green-500 hover:bg-green-600 hover:scale-105 transition-transform"
            onClick={handleDownload}
            loading={createPlaylist.isPending}
            title="Download Playlist"
          >
            <i className="fa-solid fa-download text-xl" />
          </Button>

          <SpotifyLinkButton url={spotifyUrl} />
        </div>
      }
      tracks={tracks}
      error={error}
      onGoBack={handleGoBack}
      onRetryTrack={handleRetryTrack}
      onDownloadTrack={handleDownloadTrack}
    />
  );
};
