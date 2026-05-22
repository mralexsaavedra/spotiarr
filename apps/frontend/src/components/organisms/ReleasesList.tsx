import type { ArtistRelease } from "@spotiarr/shared";
import { type FC, memo, useCallback } from "react";
import { AlbumCard } from "../molecules/AlbumCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface ReleaseItemProps {
  release: ArtistRelease;
  onReleaseClick: (release: ArtistRelease) => void;
  onArtistClick: (artistId: string) => void;
}

const ReleaseItem: FC<ReleaseItemProps> = memo(({ release, onReleaseClick, onArtistClick }) => {
  const handleCardClick = useCallback(() => {
    onReleaseClick(release);
  }, [onReleaseClick, release]);

  return (
    <AlbumCard
      albumId={release.albumId}
      artistId={release.artistId}
      albumName={release.albumName}
      artistName={release.artistName}
      coverUrl={release.coverUrl}
      releaseDate={release.releaseDate}
      albumType={release.albumType}
      onCardClick={handleCardClick}
      onArtistClick={onArtistClick}
    />
  );
});

interface ReleasesListProps {
  releases: ArtistRelease[];
  onReleaseClick: (release: ArtistRelease) => void;
  onArtistClick: (artistId: string) => void;
}

export const ReleasesList: FC<ReleasesListProps> = ({
  releases,
  onReleaseClick,
  onArtistClick,
}) => {
  const renderItem = useCallback(
    (release: ArtistRelease) => (
      <ReleaseItem
        release={release}
        onReleaseClick={onReleaseClick}
        onArtistClick={onArtistClick}
      />
    ),
    [onReleaseClick, onArtistClick],
  );

  return (
    <VirtualGrid
      items={releases}
      itemKey={(release) => `${release.albumId}-${release.artistId}`}
      renderItem={renderItem}
    />
  );
};
