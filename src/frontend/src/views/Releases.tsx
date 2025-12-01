import { FC, MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { ConnectSpotifyPrompt } from "../components/molecules/ConnectSpotifyPrompt";
import { EmptyState } from "../components/molecules/EmptyState";
import { RateLimitedMessage } from "../components/molecules/RateLimitedMessage";
import { ReleasesList } from "../components/organisms/ReleasesList";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useReleasesQuery } from "../hooks/queries/useReleasesQuery";
import { Path } from "../routes/routes";

export const Releases: FC = () => {
  const navigate = useNavigate();

  const { releases, isLoading, error } = useReleasesQuery();
  const { data: playlists = [] } = usePlaylistsQuery();
  const createPlaylist = useCreatePlaylistMutation();

  const handleConnectSpotify = useCallback(() => {
    window.location.href = "/api/auth/spotify/login";
  }, []);

  const handleReleaseClick = useCallback(
    (release: { spotifyUrl?: string | null; albumId: string }) => {
      const existingPlaylist = playlists.find((p) => p.spotifyUrl === release.spotifyUrl);

      if (existingPlaylist) {
        navigate(`${Path.PLAYLIST_DETAIL.replace(":id", existingPlaylist.id)}`);
      } else if (release.spotifyUrl) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(release.spotifyUrl)}`);
      }
    },
    [playlists, navigate],
  );

  const handleDownloadRelease = useCallback(
    (e: MouseEvent, spotifyUrl: string) => {
      e.stopPropagation();
      createPlaylist.mutate(spotifyUrl);
    },
    [createPlaylist],
  );

  if (error === "missing_user_access_token") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <ConnectSpotifyPrompt onConnect={handleConnectSpotify} />
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title="Releases" className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : error === "spotify_rate_limited" ? (
          <RateLimitedMessage />
        ) : error ? (
          <div className="text-red-400 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" /> Failed to load releases. Please try
            again later.
          </div>
        ) : !releases || releases.length === 0 ? (
          <EmptyState
            icon="fa-compact-disc"
            title="No new releases"
            description="No recent releases found from your followed artists."
          />
        ) : (
          <ReleasesList
            releases={releases}
            playlists={playlists}
            onReleaseClick={handleReleaseClick}
            onDownloadRelease={handleDownloadRelease}
          />
        )}
      </div>
    </section>
  );
};
