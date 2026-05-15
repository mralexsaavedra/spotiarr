import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { useBulkPlaylistStatus } from "@/contexts/DownloadStatusContext";
import { AlbumCard } from "../molecules/AlbumCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface ReleaseItemProps {
  release: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  isResolvingUrl: boolean;
  onReleaseClick: (release: ArtistRelease) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
  onArtistClick: (artistId: string) => void;
}

const ReleaseItem: FC<ReleaseItemProps> = memo(
  ({
    release,
    isDownloaded,
    isDownloading,
    isResolvingUrl,
    onReleaseClick,
    onDownloadRelease,
    onArtistClick,
  }) => {
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

    return (
      <AlbumCard
        albumId={release.albumId}
        artistId={release.artistId}
        albumName={release.albumName}
        artistName={release.artistName}
        coverUrl={release.coverUrl}
        releaseDate={release.releaseDate}
        spotifyUrl={release.spotifyUrl}
        isDownloaded={isDownloaded}
        isDownloading={isDownloading}
        isResolvingUrl={isResolvingUrl}
        albumType={release.albumType}
        onCardClick={handleCardClick}
        onDownloadClick={handleDownloadClick}
        onArtistClick={onArtistClick}
      />
    );
  },
);

interface ReleasesListProps {
  releases: ArtistRelease[];
  onReleaseClick: (release: ArtistRelease) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
  onArtistClick: (artistId: string) => void;
  isResolvingAlbum: (release: ArtistRelease) => boolean;
}

export const ReleasesList: FC<ReleasesListProps> = ({
  releases,
  onReleaseClick,
  onDownloadRelease,
  onArtistClick,
  isResolvingAlbum,
}) => {
  const releaseStatusItems = useMemo(
    () =>
      releases.map((release) => ({
        url: release.spotifyUrl,
        totalTracks: release.totalTracks,
      })),
    [releases],
  );

  const downloadStatesMap = useBulkPlaylistStatus(releaseStatusItems);

  const renderItem = useCallback(
    (release: ArtistRelease) => {
      const downloadState = release.spotifyUrl
        ? downloadStatesMap.get(release.spotifyUrl)
        : undefined;

      const isDownloaded = downloadState?.isDownloaded ?? false;
      const isDownloading = downloadState?.isDownloading ?? false;

      return (
        <ReleaseItem
          release={release}
          isDownloaded={isDownloaded}
          isDownloading={isDownloading}
          isResolvingUrl={isResolvingAlbum(release)}
          onReleaseClick={onReleaseClick}
          onDownloadRelease={onDownloadRelease}
          onArtistClick={onArtistClick}
        />
      );
    },
    [downloadStatesMap, isResolvingAlbum, onReleaseClick, onDownloadRelease, onArtistClick],
  );

  return (
    <VirtualGrid
      items={releases}
      itemKey={(release) => `${release.albumId}-${release.artistId}`}
      renderItem={renderItem}
    />
  );
};
