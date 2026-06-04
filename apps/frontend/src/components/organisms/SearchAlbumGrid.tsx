import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback } from "react";
import { useAlbumListDownloadStates } from "@/hooks/useAlbumListDownloadStates";
import { AlbumCard } from "../molecules/AlbumCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

type AlbumNavTarget = Pick<ArtistRelease, "spotifyUrl" | "artistId" | "albumId">;

interface SearchAlbumGridProps {
  albums: ArtistRelease[];
  onClick: (album: AlbumNavTarget) => void;
  onArtistClick: (artistId: string) => void;
  onDownload: (album: AlbumNavTarget) => void;
}

interface SearchAlbumItemProps {
  album: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onClick: (album: AlbumNavTarget) => void;
  onArtistClick: (artistId: string) => void;
  onDownload: (album: AlbumNavTarget) => void;
}

export const SearchAlbumItem: FC<SearchAlbumItemProps> = memo(
  ({ album, isDownloaded, isDownloading, onClick, onArtistClick, onDownload }) => {
    const handleCardClick = useCallback(() => {
      onClick({ spotifyUrl: album.spotifyUrl, artistId: album.artistId, albumId: album.albumId });
    }, [album.spotifyUrl, album.artistId, album.albumId, onClick]);

    const handleDownloadClick = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        onDownload({
          spotifyUrl: album.spotifyUrl,
          artistId: album.artistId,
          albumId: album.albumId,
        });
      },
      [album.spotifyUrl, album.artistId, album.albumId, onDownload],
    );

    return (
      <AlbumCard
        albumId={album.albumId}
        artistId={album.artistId}
        albumName={album.albumName}
        artistName={album.artistName}
        coverUrl={album.coverUrl}
        releaseDate={album.releaseDate}
        spotifyUrl={album.spotifyUrl}
        isDownloaded={isDownloaded}
        isDownloading={isDownloading}
        albumType={album.albumType}
        onCardClick={handleCardClick}
        onDownloadClick={handleDownloadClick}
        onArtistClick={onArtistClick}
      />
    );
  },
);

export const SearchAlbumGrid: FC<SearchAlbumGridProps> = ({
  albums,
  onClick,
  onArtistClick,
  onDownload,
}) => {
  const downloadStatesMap = useAlbumListDownloadStates(albums);

  const renderItem = useCallback(
    (album: ArtistRelease) => {
      const downloadState = album.spotifyUrl ? downloadStatesMap.get(album.spotifyUrl) : undefined;
      return (
        <SearchAlbumItem
          album={album}
          isDownloaded={downloadState?.isDownloaded ?? false}
          isDownloading={downloadState?.isDownloading ?? false}
          onClick={onClick}
          onArtistClick={onArtistClick}
          onDownload={onDownload}
        />
      );
    },
    [downloadStatesMap, onClick, onArtistClick, onDownload],
  );

  return <VirtualGrid items={albums} itemKey={(album) => album.albumId} renderItem={renderItem} />;
};
