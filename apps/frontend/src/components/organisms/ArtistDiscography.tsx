import type { ArtistRelease } from "@spotiarr/shared";
import { type FC, memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms/Button";
import { AlbumCard } from "../molecules/AlbumCard";
import {
  ArtistDiscographyFilters,
  type DiscographyFilter,
} from "../molecules/ArtistDiscographyFilters";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface ArtistDiscographyProps {
  filter: DiscographyFilter;
  onFilterChange: (filter: DiscographyFilter) => void;
  filteredAlbums: ArtistRelease[];
  visibleItems: number;
  isLoadingMore: boolean;
  onShowMore: () => void;
  canShowMore: boolean;
  onDiscographyItemClick: (album: ArtistRelease) => void;
  onArtistClick: (artistId: string) => void;
}

interface DiscographyItemProps {
  album: ArtistRelease;
  onDiscographyItemClick: (album: ArtistRelease) => void;
  onArtistClick: (artistId: string) => void;
}

const DiscographyItem: FC<DiscographyItemProps> = memo(
  ({ album, onDiscographyItemClick, onArtistClick }) => {
    const handleCardClick = useCallback(() => {
      onDiscographyItemClick(album);
    }, [album, onDiscographyItemClick]);

    return (
      <AlbumCard
        albumId={album.albumId}
        artistId={album.artistId}
        albumName={album.albumName}
        artistName={album.artistName}
        coverUrl={album.coverUrl}
        releaseDate={album.releaseDate}
        albumType={album.albumType}
        onCardClick={handleCardClick}
        onArtistClick={onArtistClick}
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
  onDiscographyItemClick,
  onArtistClick,
}) => {
  const { t } = useTranslation();

  const displayedItems = useMemo(
    () => filteredAlbums.slice(0, visibleItems),
    [filteredAlbums, visibleItems],
  );

  const renderDiscographyItem = useCallback(
    (album: ArtistRelease) => (
      <DiscographyItem
        key={album.albumId}
        album={album}
        onDiscographyItemClick={onDiscographyItemClick}
        onArtistClick={onArtistClick}
      />
    ),
    [onDiscographyItemClick, onArtistClick],
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
        <VirtualGrid
          items={displayedItems}
          itemKey={(album) => album.albumId}
          renderItem={renderDiscographyItem}
          footer={
            canShowMore ? (
              <div className="mt-8 flex justify-center pb-8">
                <Button onClick={onShowMore} loading={isLoadingMore} variant="secondary" size="md">
                  {t("artist.discography.showMore")}
                </Button>
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
};
