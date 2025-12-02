import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { PlaylistStatusEnum, type Playlist } from "../../types/playlist";
import { getPlaylistStatus } from "../../utils/playlist";
import { VirtualGrid } from "../molecules/VirtualGrid";
import { AlbumCard } from "./AlbumCard";

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

export const ReleasesList: FC<ReleasesListProps> = ({
  releases,
  playlists,
  onReleaseClick,
  onDownloadRelease,
}) => {
  const playlistsMap = useMemo(() => {
    const map = new Map<string, Playlist>();
    playlists.forEach((p) => {
      if (p.spotifyUrl) map.set(p.spotifyUrl, p);
    });
    return map;
  }, [playlists]);

  const renderItem = useCallback(
    (release: ArtistRelease) => {
      const playlist = release.spotifyUrl ? playlistsMap.get(release.spotifyUrl) : undefined;
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
    },
    [playlistsMap, onReleaseClick, onDownloadRelease],
  );

  return (
    <VirtualGrid
      items={releases}
      itemKey={(release) => `${release.albumId}-${release.artistId}`}
      renderItem={renderItem}
    />
  );
};
