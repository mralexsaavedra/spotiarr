import { ArtistRelease, NormalizedTrack } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useBulkPlaylistStatus } from "@/contexts/DownloadStatusContext";
import { Button } from "../atoms/Button";
import { AlbumCard } from "../molecules/AlbumCard";
import { ArtistDiscographyFilters, DiscographyFilter } from "../molecules/ArtistDiscographyFilters";
import { VirtualGrid } from "../molecules/VirtualGrid";
import { TracksModal } from "./TracksModal";

interface ArtistDiscographyProps {
  artistId: string;
  albums: ArtistRelease[];
  filter: DiscographyFilter;
  onFilterChange: (filter: DiscographyFilter) => void;
  filteredAlbums: ArtistRelease[];
  visibleItems: number;
  isLoadingMore: boolean;
  onShowMore: () => void;
  canShowMore: boolean;
  onDownload: (url: string) => void;
  onDiscographyItemClick: (url: string) => void;
  onArtistClick: (artistId: string) => void;
  onAlbumExpand: (album: ArtistRelease) => void;
  onAlbumExpandClose: () => void;
  expandedAlbum: ArtistRelease | null;
  albumTracks: NormalizedTrack[];
  isLoadingTracks: boolean;
}

interface DiscographyItemProps {
  album: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onDiscographyItemClick: (url: string) => void;
  onDownload: (url: string) => void;
  onArtistClick: (artistId: string) => void;
  onExpandClick: (album: ArtistRelease) => void;
}

const DiscographyItem: FC<DiscographyItemProps> = memo(
  ({
    album,
    isDownloaded,
    isDownloading,
    onDiscographyItemClick,
    onDownload,
    onArtistClick,
    onExpandClick,
  }) => {
    const handleCardClick = useCallback(() => {
      if (album.spotifyUrl) {
        onDiscographyItemClick(album.spotifyUrl);
      }
    }, [album.spotifyUrl, onDiscographyItemClick]);

    const handleDownloadClick = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        if (album.spotifyUrl) {
          onDownload(album.spotifyUrl);
        }
      },
      [album.spotifyUrl, onDownload],
    );

    const handleExpandClick = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        onExpandClick(album);
      },
      [album, onExpandClick],
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
        onExpandClick={handleExpandClick}
      />
    );
  },
);

export const ArtistDiscography: FC<ArtistDiscographyProps> = ({
  filter,
  onFilterChange,
  filteredAlbums,
  visibleItems,
  isLoadingMore,
  onShowMore,
  canShowMore,
  onDownload,
  onDiscographyItemClick,
  onArtistClick,
  onAlbumExpand,
  onAlbumExpandClose,
  expandedAlbum,
  albumTracks,
  isLoadingTracks,
}) => {
  const { t } = useTranslation();

  const displayedItems = useMemo(
    () => filteredAlbums.slice(0, visibleItems),
    [filteredAlbums, visibleItems],
  );

  const albumStatusItems = useMemo(
    () =>
      displayedItems.map((album) => ({
        url: album.spotifyUrl,
        totalTracks: album.totalTracks,
      })),
    [displayedItems],
  );

  const downloadStatesMap = useBulkPlaylistStatus(albumStatusItems);

  const renderDiscographyItem = useCallback(
    (album: ArtistRelease) => {
      const downloadState = album.spotifyUrl ? downloadStatesMap.get(album.spotifyUrl) : undefined;

      const isDownloaded = downloadState?.isDownloaded ?? false;
      const isDownloading = downloadState?.isDownloading ?? false;

      return (
        <DiscographyItem
          key={album.albumId}
          album={album}
          isDownloaded={isDownloaded}
          isDownloading={isDownloading}
          onDiscographyItemClick={onDiscographyItemClick}
          onDownload={onDownload}
          onArtistClick={onArtistClick}
          onExpandClick={onAlbumExpand}
        />
      );
    },
    [downloadStatesMap, onDiscographyItemClick, onDownload, onArtistClick, onAlbumExpand],
  );

  return (
    <div className="mt-10 pb-24 md:pb-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("artist.discography.title")}</h2>
      </div>

      <ArtistDiscographyFilters currentFilter={filter} onFilterChange={onFilterChange} />

      {filteredAlbums.length === 0 ? (
        <div className="text-text-secondary rounded-lg bg-white/5 py-12 text-center">
          <p>{t("artist.discography.emptyFiltered")}</p>
        </div>
      ) : (
        <>
          <VirtualGrid
            items={displayedItems}
            itemKey={(album) => album.albumId}
            renderItem={renderDiscographyItem}
            footer={
              canShowMore ? (
                <div className="mt-8 flex justify-center pb-8">
                  <Button
                    onClick={onShowMore}
                    loading={isLoadingMore}
                    variant="secondary"
                    size="md"
                  >
                    {t("artist.discography.showMore")}
                  </Button>
                </div>
              ) : undefined
            }
          />
        </>
      )}

      <TracksModal
        isOpen={!!expandedAlbum}
        albumName={expandedAlbum?.albumName ?? ""}
        artistName={expandedAlbum?.artistName ?? ""}
        coverUrl={expandedAlbum?.coverUrl}
        tracks={albumTracks}
        isLoading={isLoadingTracks}
        onClose={onAlbumExpandClose}
      />
    </div>
  );
};
