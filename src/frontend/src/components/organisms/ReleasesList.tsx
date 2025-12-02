import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback } from "react";
import { useDownloadStatus } from "../../hooks/useDownloadStatus";
import { VirtualGrid } from "../molecules/VirtualGrid";
import { AlbumCard } from "./AlbumCard";

interface ReleaseItemProps {
  release: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
  onArtistClick: (artistId: string) => void;
}

const ReleaseItem: FC<ReleaseItemProps> = memo(
  ({ release, isDownloaded, isDownloading, onReleaseClick, onDownloadRelease, onArtistClick }) => {
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
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
  onArtistClick: (artistId: string) => void;
}

export const ReleasesList: FC<ReleasesListProps> = ({
  releases,
  onReleaseClick,
  onDownloadRelease,
  onArtistClick,
}) => {
  const { isPlaylistDownloaded, isPlaylistDownloading } = useDownloadStatus();

  const renderItem = useCallback(
    (release: ArtistRelease) => {
      const isDownloaded = isPlaylistDownloaded(release.spotifyUrl);
      const isDownloading = isPlaylistDownloading(release.spotifyUrl);

      return (
        <ReleaseItem
          release={release}
          isDownloaded={isDownloaded}
          isDownloading={isDownloading}
          onReleaseClick={onReleaseClick}
          onDownloadRelease={onDownloadRelease}
          onArtistClick={onArtistClick}
        />
      );
    },
    [isPlaylistDownloaded, isPlaylistDownloading, onReleaseClick, onDownloadRelease, onArtistClick],
  );

  return (
    <VirtualGrid
      items={releases}
      itemKey={(release) => `${release.albumId}-${release.artistId}`}
      renderItem={renderItem}
    />
  );
};
