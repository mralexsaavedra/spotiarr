import { ArtistRelease } from "@spotiarr/shared";
import { FC, MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "../../routes/routes";
import { api } from "../../services/api";
import { Playlist, PlaylistStatusEnum } from "../../types/playlist";
import { getPlaylistStatus } from "../../utils/playlist";
import { ArtistDiscographyFilters, DiscographyFilter } from "../molecules/ArtistDiscographyFilters";
import { ReleaseCard } from "./ReleaseCard";

interface ArtistDiscographyProps {
  artistId: string;
  albums: ArtistRelease[];
  playlists?: Playlist[];
  onDownload: (url: string) => void;
}

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
  artistId,
  albums,
  playlists,
  onDownload,
}) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<DiscographyFilter>("all");
  const [visibleItems, setVisibleItems] = useState(12);
  const [allAlbums, setAllAlbums] = useState<ArtistRelease[]>(albums);
  const [hasFetchedAll, setHasFetchedAll] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setAllAlbums(albums);
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    let result = allAlbums;

    if (filter !== "all") {
      result = result.filter((a) => a.albumType === filter);
    }

    return [...result].sort((a, b) => {
      const dateA = a.releaseDate || "";
      const dateB = b.releaseDate || "";
      return dateB.localeCompare(dateA);
    });
  }, [allAlbums, filter]);

  useEffect(() => {
    setVisibleItems(12);
  }, [filter]);

  const handleNavigate = useCallback(
    (url: string) => {
      navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(url)}`);
    },
    [navigate],
  );

  const handleShowMore = useCallback(async () => {
    if (!hasFetchedAll) {
      setIsLoadingMore(true);
      try {
        const moreAlbums = await api.getArtistAlbums(artistId, 1000, 12);
        const existingIds = new Set(allAlbums.map((a) => a.albumId));
        const uniqueNewAlbums = moreAlbums.filter((a) => !existingIds.has(a.albumId));

        setAllAlbums((prev) => [...prev, ...uniqueNewAlbums]);
        setHasFetchedAll(true);
      } catch (error) {
        console.error("Failed to fetch more albums", error);
      } finally {
        setIsLoadingMore(false);
      }
    }

    setVisibleItems((prev) => prev + 12);
  }, [artistId, hasFetchedAll, allAlbums]);

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Discography</h2>
      </div>

      <ArtistDiscographyFilters currentFilter={filter} onFilterChange={setFilter} />

      {filteredAlbums.length === 0 ? (
        <div className="py-12 text-center text-text-secondary bg-white/5 rounded-lg">
          <p>No releases found for this category.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAlbums.slice(0, visibleItems).map((album) => {
              const playlist = playlists?.find((p) => p.spotifyUrl === album.spotifyUrl);
              const status = playlist ? getPlaylistStatus(playlist) : undefined;

              const isDownloaded = status === PlaylistStatusEnum.Completed;
              const isDownloading =
                status !== undefined && !isDownloaded && status !== PlaylistStatusEnum.Error;

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

          {(visibleItems < filteredAlbums.length ||
            (!hasFetchedAll && filteredAlbums.length >= 12)) && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleShowMore}
                disabled={isLoadingMore}
                className="px-6 py-2 text-sm font-medium text-white transition-colors border rounded-full border-white/20 hover:bg-white/10 hover:border-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? "Loading..." : "Show more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
