import { ArtistRelease } from "@spotiarr/shared";
import { FC, useMemo, useState } from "react";
import { ReleaseCard } from "./ReleaseCard";

interface ArtistDiscographyProps {
  albums: ArtistRelease[];
  onDownload: (url: string) => void;
}

type DiscographyFilter = "popular" | "album" | "single" | "compilation";

const FilterButton: FC<{ active: boolean; onClick: () => void; label: string }> = ({
  active,
  onClick,
  label,
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
      active ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
    }`}
  >
    {label}
  </button>
);

export const ArtistDiscography: FC<ArtistDiscographyProps> = ({ albums, onDownload }) => {
  const [filter, setFilter] = useState<DiscographyFilter>("popular");

  const filteredAlbums = useMemo(() => {
    let result = albums;

    if (filter !== "popular") {
      result = result.filter((a) => a.albumType === filter);
    }

    // Sort by release date desc
    return [...result].sort((a, b) => {
      const dateA = a.releaseDate || "";
      const dateB = b.releaseDate || "";
      return dateB.localeCompare(dateA);
    });
  }, [albums, filter]);

  if (!albums || albums.length === 0) return null;

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Discography</h2>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <FilterButton
          active={filter === "popular"}
          onClick={() => setFilter("popular")}
          label="Popular releases"
        />
        <FilterButton
          active={filter === "album"}
          onClick={() => setFilter("album")}
          label="Albums"
        />
        <FilterButton
          active={filter === "single"}
          onClick={() => setFilter("single")}
          label="Singles & EPs"
        />
        <FilterButton
          active={filter === "compilation"}
          onClick={() => setFilter("compilation")}
          label="Compilations"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredAlbums.slice(0, 12).map((album) => (
          <ReleaseCard
            key={album.albumId}
            albumId={album.albumId}
            artistId={album.artistId}
            albumName={album.albumName}
            artistName={album.artistName}
            coverUrl={album.coverUrl}
            releaseDate={album.releaseDate}
            spotifyUrl={album.spotifyUrl}
            isDownloaded={false} // TODO: Check status if needed
            isDownloading={false} // TODO: Check status if needed
            albumType={album.albumType}
            onCardClick={() => {}} // TODO: Navigate
            onDownloadClick={(e) => {
              e.stopPropagation();
              if (album.spotifyUrl) {
                onDownload(album.spotifyUrl);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
