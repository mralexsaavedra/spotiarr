import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "@/components/atoms/Loading";
import { AlbumCard } from "@/components/molecules/AlbumCard";
import { ArtistCard } from "@/components/molecules/ArtistCard";
import { SearchTopResultCard } from "@/components/molecules/SearchTopResultCard";
import { SearchAlbumGrid } from "@/components/organisms/SearchAlbumGrid";
import { SearchArtistGrid } from "@/components/organisms/SearchArtistGrid";
import { SearchGridSection } from "@/components/organisms/SearchGridSection";
import { SearchTrackList } from "@/components/organisms/SearchTrackList";
import { SEARCH_TABS, useSearchController } from "@/hooks/controllers/useSearchController";

export const Search: FC = () => {
  const { t } = useTranslation();
  const {
    query,
    results,
    isLoading,
    hasResults,
    activeTab,
    setActiveTab,
    topResult,
    topTracks,
    topAlbums,
    topAlbumsStatusMap,
    handleDownloadTrack,
    handleAlbumClick,
    handleDownloadAlbum,
    handleArtistClick,
    handleTopResultClick,
  } = useSearchController();

  return (
    <section className="bg-background flex flex-1 flex-col px-4 pb-6 md:px-8">
      {/* Sticky header with filter tabs */}
      <div className="bg-background/95 sticky top-[60px] z-30 -mx-4 mb-6 border-b border-white/10 px-4 py-3 shadow-md backdrop-blur-md md:-mx-8 md:px-8">
        {query && (
          <h1 className="mb-4 text-2xl font-bold text-white md:text-3xl">
            {t("search.resultsFor")} <span className="font-black">"{query}"</span>
          </h1>
        )}
        <div className="flex flex-wrap gap-2">
          {SEARCH_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {/* @ts-expect-error Typescript cannot infer template literal string accurately for i18n keys */}
              {t(`common.${tab.labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-col gap-8">
        {!query ? (
          <div className="text-text-secondary flex flex-1 items-center justify-center py-20 text-lg">
            {t("search.emptyState")}
          </div>
        ) : isLoading ? (
          <Loading />
        ) : !hasResults ? (
          <div className="py-20 text-center text-zinc-400">{t("search.noResults")}</div>
        ) : (
          <>
            {/* ── All tab: Top result + top tracks ─────────────────────────── */}
            {activeTab === "all" && (topResult || topTracks.length > 0) && (
              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                {/* Top Result */}
                {topResult && (
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">{t("search.topResult")}</h2>
                    <SearchTopResultCard item={topResult} onClick={handleTopResultClick} />
                  </div>
                )}

                {/* Top tracks — always shown */}
                {topTracks.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">{t("search.tracks")}</h2>
                    <SearchTrackList tracks={topTracks} onDownload={handleDownloadTrack} />
                  </div>
                )}
              </div>
            )}

            {/* ── Artists section ─────────────────────────────────────────── */}
            {activeTab === "all" && (results?.artists?.length ?? 0) > 0 && (
              <SearchGridSection title={t("search.artists")}>
                {results!.artists.slice(0, 6).map((artist) => (
                  <ArtistCard
                    key={artist.id}
                    id={artist.id}
                    name={artist.name}
                    image={artist.image}
                    spotifyUrl={artist.spotifyUrl}
                    onClick={handleArtistClick}
                  />
                ))}
              </SearchGridSection>
            )}
            {activeTab === "artists" && (results?.artists?.length ?? 0) > 0 && (
              <section className="flex flex-1 flex-col">
                <h2 className="mb-4 text-2xl font-bold text-white">{t("search.artists")}</h2>
                <SearchArtistGrid artists={results!.artists} onClick={handleArtistClick} />
              </section>
            )}

            {/* ── Full track list (tracks tab only) ───────────────────────── */}
            {activeTab === "tracks" && (results?.tracks?.length ?? 0) > 0 && (
              <section className="flex flex-1 flex-col">
                <h2 className="mb-4 text-2xl font-bold text-white">{t("search.tracks")}</h2>
                <SearchTrackList tracks={results!.tracks} onDownload={handleDownloadTrack} />
              </section>
            )}

            {/* ── Albums section ──────────────────────────────────────────── */}
            {activeTab === "all" && (results?.albums?.length ?? 0) > 0 && (
              <SearchGridSection title={t("search.albums")}>
                {topAlbums.map((album) => {
                  const downloadState = album.spotifyUrl
                    ? topAlbumsStatusMap.get(album.spotifyUrl)
                    : undefined;
                  return (
                    <AlbumCard
                      key={album.albumId}
                      albumId={album.albumId}
                      artistId={album.artistId}
                      albumName={album.albumName}
                      artistName={album.artistName}
                      coverUrl={album.coverUrl}
                      releaseDate={album.releaseDate}
                      spotifyUrl={album.spotifyUrl}
                      albumType={album.albumType}
                      isDownloaded={downloadState?.isDownloaded ?? false}
                      isDownloading={downloadState?.isDownloading ?? false}
                      onCardClick={() => album.spotifyUrl && handleAlbumClick(album.spotifyUrl)}
                      onDownloadClick={(e) => {
                        e.stopPropagation();
                        if (album.spotifyUrl) handleDownloadAlbum(album.spotifyUrl);
                      }}
                      onArtistClick={handleArtistClick}
                    />
                  );
                })}
              </SearchGridSection>
            )}
            {activeTab === "albums" && (results?.albums?.length ?? 0) > 0 && (
              <section className="flex flex-1 flex-col">
                <h2 className="mb-4 text-2xl font-bold text-white">{t("search.albums")}</h2>
                <SearchAlbumGrid
                  albums={results!.albums}
                  onClick={handleAlbumClick}
                  onArtistClick={handleArtistClick}
                  onDownload={handleDownloadAlbum}
                />
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
};
