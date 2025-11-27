import { FC, MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectSpotifyPrompt } from "../components/ConnectSpotifyPrompt";
import { EmptyReleases } from "../components/EmptyReleases";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { RateLimitedMessage } from "../components/RateLimitedMessage";
import { ReleaseCard } from "../components/ReleaseCard";
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
      createPlaylist.mutate(spotifyUrl, {
        onSuccess: () => {
          navigate(Path.HOME);
        },
      });
    },
    [createPlaylist, navigate],
  );

  const handleSpotifyLinkClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (isLoading) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="New Releases" />
        <Loading message="Loading releases..." />
      </section>
    );
  }

  if (error === "spotify_rate_limited") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <RateLimitedMessage />
      </section>
    );
  }

  if (error === "missing_user_access_token") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <ConnectSpotifyPrompt onConnect={handleConnectSpotify} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="New Releases" />
        <div className="text-red-400 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation" /> Failed to load releases. Please try
          again later.
        </div>
      </section>
    );
  }

  if (!releases || releases.length === 0) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <EmptyReleases />
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <PageHeader title="New Releases" />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {releases.map((release) => {
          const isDownloaded = playlists.some((p) => p.spotifyUrl === release.spotifyUrl);

          return (
            <ReleaseCard
              key={`${release.albumId}-${release.artistId}`}
              albumId={release.albumId}
              artistId={release.artistId}
              albumName={release.albumName}
              artistName={release.artistName}
              coverUrl={release.coverUrl}
              releaseDate={release.releaseDate}
              spotifyUrl={release.spotifyUrl}
              isDownloaded={isDownloaded}
              onCardClick={() => handleReleaseClick(release)}
              onDownloadClick={(e) => handleDownloadRelease(e, release.spotifyUrl!)}
              onSpotifyLinkClick={handleSpotifyLinkClick}
            />
          );
        })}
      </div>
    </section>
  );
};
