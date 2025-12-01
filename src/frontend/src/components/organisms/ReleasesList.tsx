import { ArtistRelease } from "@spotiarr/shared";
import { FC, forwardRef, HTMLAttributes, memo, MouseEvent, useCallback } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { PlaylistStatusEnum, type Playlist } from "../../types/playlist";
import { getPlaylistStatus } from "../../utils/playlist";
import { ReleaseCard } from "./ReleaseCard";

interface ReleaseItemProps {
  release: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
}

const ReleaseItem: FC<ReleaseItemProps> = memo(
  ({ release, isDownloaded, isDownloading, onReleaseClick, onDownloadRelease }) => {
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
      <ReleaseCard
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
      />
    );
  },
);

interface ReleasesListProps {
  releases: ArtistRelease[];
  playlists: Playlist[];
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
}

const GridList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div
    ref={ref}
    {...props}
    className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  />
));

const GridItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div ref={ref} {...props} className="contents" />
));

export const ReleasesList: FC<ReleasesListProps> = ({
  releases,
  playlists,
  onReleaseClick,
  onDownloadRelease,
}) => {
  return (
    <VirtuosoGrid
      useWindowScroll
      data={releases}
      components={{
        List: GridList,
        Item: GridItem,
      }}
      itemContent={(index, release) => {
        const playlist = playlists.find((p) => p.spotifyUrl === release.spotifyUrl);
        const status = playlist ? getPlaylistStatus(playlist) : undefined;

        const isDownloaded = status === PlaylistStatusEnum.Completed;
        const isDownloading =
          status !== undefined && !isDownloaded && status !== PlaylistStatusEnum.Error;

        return (
          <ReleaseItem
            release={release}
            isDownloaded={isDownloaded}
            isDownloading={isDownloading}
            onReleaseClick={onReleaseClick}
            onDownloadRelease={onDownloadRelease}
          />
        );
      }}
    />
  );
};
