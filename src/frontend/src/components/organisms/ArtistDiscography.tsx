import { ArtistRelease, DownloadHistoryItem, IPlaylist } from "@spotiarr/shared";
import { FC, MouseEvent, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../../routes/routes";
import { ReleaseCard } from "./ReleaseCard";

interface ArtistDiscographyProps {
  albums: ArtistRelease[];
  playlists?: IPlaylist[];
  downloadTracks?: DownloadHistoryItem[];
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

interface DiscographyItemProps {
  album: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onNavigate: (url: string) => void;
  onDownload: (url: string) => void;
}

const DiscographyItem: FC<DiscographyItemProps> = ({
  album,
  isDownloaded,
  isDownloading,
  onNavigate,
  onDownload,
}) => {
  const handleCardClick = useCallback(() => {
    if (album.spotifyUrl) {
      onNavigate(album.spotifyUrl);
    }
  }, [album.spotifyUrl, onNavigate]);

  const handleDownloadClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (album.spotifyUrl) {
        onDownload(album.spotifyUrl);
      }
    },
    [album.spotifyUrl, onDownload],
  );

  return (
    <ReleaseCard
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
    />
  );
};

export const ArtistDiscography: FC<ArtistDiscographyProps> = ({
  albums,
  playlists,
  downloadTracks,
  onDownload,
}) => {
  const navigate = useNavigate();
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

  const handleNavigate = useCallback(
    (url: string) => {
      navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(url)}`);
    },
    [navigate],
  );

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

      {filteredAlbums.length === 0 ? (
        <div className="py-12 text-center text-text-secondary bg-white/5 rounded-lg">
          <p>No releases found for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredAlbums.slice(0, 12).map((album) => {
            const isDownloaded =
              playlists?.some((p) => p.spotifyUrl === album.spotifyUrl) ||
              downloadTracks?.some((t) => t.playlistSpotifyUrl === album.spotifyUrl) ||
              false;

            // We don't have real-time downloading status for albums yet, only history.
            const isDownloading = false;

            return (
              <DiscographyItem
                key={album.albumId}
                album={album}
                isDownloaded={isDownloaded}
                isDownloading={isDownloading}
                onNavigate={handleNavigate}
                onDownload={onDownload}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
