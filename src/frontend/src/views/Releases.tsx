import { FC, MouseEvent, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { EmptyReleases } from "../components/molecules/EmptyReleases";
import { RateLimitedMessage } from "../components/molecules/RateLimitedMessage";
import { ConnectSpotifyPrompt } from "../components/organisms/ConnectSpotifyPrompt";
import { ReleaseCard } from "../components/organisms/ReleaseCard";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useReleasesQuery } from "../hooks/queries/useReleasesQuery";
import { Path } from "../routes/routes";

interface ReleaseItemProps {
  release: {
    albumId: string;
    artistId: string;
    albumName: string;
    artistName: string;
    coverUrl?: string | null;
    releaseDate?: string | null;
    spotifyUrl?: string | null;
  };
  isDownloaded: boolean;
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
  onSpotifyLinkClick: (e: MouseEvent) => void;
}

const ReleaseItem = memo(
  ({
    release,
    isDownloaded,
    onReleaseClick,
    onDownloadRelease,
    onSpotifyLinkClick,
  }: ReleaseItemProps) => {
    const handleCardClick = useCallback(() => {
      onReleaseClick(release);
    }, [onReleaseClick, release]);

    const handleDownloadClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (release.spotifyUrl) {
          onDownloadRelease(e, release.spotifyUrl);
        }
      },
      [onDownloadRelease, release.spotifyUrl],
    );

    const handleSpotifyLinkClick = useCallback(
      (e: MouseEvent<HTMLAnchorElement>) => {
        onSpotifyLinkClick(e);
      },
      [onSpotifyLinkClick],
    );

    return (
      <ReleaseCard
        albumId={release.albumId}
        artistId={release.artistId}
        albumName={release.albumName}
        artistName={release.artistName}
        coverUrl={release.coverUrl}
        releaseDate={release.releaseDate}
        spotifyUrl={release.spotifyUrl}
        isDownloaded={isDownloaded}
        onCardClick={handleCardClick}
        onDownloadClick={handleDownloadClick}
        onSpotifyLinkClick={handleSpotifyLinkClick}
      />
    );
  },
);

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

  if (error === "missing_user_access_token") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <ConnectSpotifyPrompt onConnect={handleConnectSpotify} />
      </section>
    );
  }
  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <PageHeader title="New Releases" />

      {isLoading ? (
        <Loading message="Loading releases..." />
      ) : error === "spotify_rate_limited" ? (
        <RateLimitedMessage />
      ) : error ? (
        <div className="text-red-400 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation" /> Failed to load releases. Please try
          again later.
        </div>
      ) : !releases || releases.length === 0 ? (
        <EmptyReleases />
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {releases.map((release) => {
            const isDownloaded = playlists.some((p) => p.spotifyUrl === release.spotifyUrl);

            return (
              <ReleaseItem
                key={`${release.albumId}-${release.artistId}`}
                release={release}
                isDownloaded={isDownloaded}
                onReleaseClick={handleReleaseClick}
                onDownloadRelease={handleDownloadRelease}
                onSpotifyLinkClick={handleSpotifyLinkClick}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
