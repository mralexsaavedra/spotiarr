import { NormalizedTrack } from "@spotiarr/shared";
import { FC, useCallback, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loading } from "@/components/atoms/Loading";
import { AlbumCard } from "@/components/molecules/AlbumCard";
import { SearchArtistCard } from "@/components/molecules/SearchArtistCard";
import { SearchTopResultCard } from "@/components/molecules/SearchTopResultCard";
import { SearchTrackRow } from "@/components/molecules/SearchTrackRow";
import { SearchAlbumGrid } from "@/components/organisms/SearchAlbumGrid";
import { SearchArtistGrid } from "@/components/organisms/SearchArtistGrid";
import { SearchGridSection } from "@/components/organisms/SearchGridSection";
import { SearchTrackList } from "@/components/organisms/SearchTrackList";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { useCreatePlaylistMutation } from "@/hooks/mutations/useCreatePlaylistMutation";
import { useSearchQuery } from "@/hooks/queries/useSearchQuery";
import { Path } from "@/routes/routes";

type FilterTab = "all" | "tracks" | "albums" | "artists";

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "tracks", label: "Canciones" },
  { key: "artists", label: "Artistas" },
  { key: "albums", label: "Álbumes" },
];

const TYPES: Record<FilterTab, string[]> = {
  all: ["track", "album", "artist"],
  tracks: ["track"],
  albums: ["album"],
  artists: ["artist"],
};

export const Search: FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const navigate = useNavigate();
  const createPlaylist = useCreatePlaylistMutation();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const { getBulkTrackStatus } = useDownloadStatusContext();

  const { data: results, isLoading } = useSearchQuery(query, TYPES[activeTab], 20);

  const handlePreviewTrack = useCallback(
    (track: NormalizedTrack) => {
      if (track.trackUrl) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(track.trackUrl)}`);
      }
    },
    [navigate],
  );

  const handleDownloadTrack = useCallback(
    (track: NormalizedTrack) => {
      if (track.trackUrl) createPlaylist.mutate(track.trackUrl);
    },
    [createPlaylist],
  );

  const handleAlbumClick = useCallback(
    (spotifyUrl: string) => {
      navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(spotifyUrl)}`);
    },
    [navigate],
  );

  const handleDownloadAlbum = useCallback(
    (url: string) => {
      createPlaylist.mutate(url);
    },
    [createPlaylist],
  );

  const handleArtistClick = useCallback(
    (artistId: string) => navigate(Path.ARTIST_DETAIL.replace(":id", artistId)),
    [navigate],
  );

  const topResult = results?.artists?.[0] ?? null;
  const topTracks = useMemo(() => results?.tracks?.slice(0, 4) ?? [], [results?.tracks]);
  const hasResults =
    (results?.tracks?.length ?? 0) > 0 ||
    (results?.albums?.length ?? 0) > 0 ||
    (results?.artists?.length ?? 0) > 0;

  const topTracksStatusesMap = useMemo(() => {
    if (activeTab !== "all" || topTracks.length === 0) return new Map();
    const urls = topTracks.map((t) => t.trackUrl).filter(Boolean) as string[];
    return getBulkTrackStatus(urls);
  }, [activeTab, topTracks, getBulkTrackStatus]);

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
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-col gap-8 overflow-x-hidden">
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
                    <SearchTopResultCard artist={topResult} onClick={handleArtistClick} />
                  </div>
                )}

                {/* Top tracks — always shown */}
                {topTracks.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">{t("search.tracks")}</h2>
                    <div className="flex flex-col">
                      {topTracks.map((track, i) => (
                        <SearchTrackRow
                          key={track.spotifyUrl ?? i}
                          track={track}
                          index={i}
                          status={
                            track.trackUrl ? topTracksStatusesMap.get(track.trackUrl) : undefined
                          }
                          onPreview={handlePreviewTrack}
                          onDownload={handleDownloadTrack}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Artists section ─────────────────────────────────────────── */}
            {activeTab === "all" && (results?.artists?.length ?? 0) > 0 && (
              <SearchGridSection title={t("search.artists")}>
                {results!.artists.slice(0, 6).map((artist) => (
                  <SearchArtistCard key={artist.id} artist={artist} onClick={handleArtistClick} />
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
                <SearchTrackList
                  tracks={results!.tracks}
                  onPreview={handlePreviewTrack}
                  onDownload={handleDownloadTrack}
                />
              </section>
            )}

            {/* ── Albums section ──────────────────────────────────────────── */}
            {activeTab === "all" && (results?.albums?.length ?? 0) > 0 && (
              <SearchGridSection title={t("search.albums")}>
                {results!.albums.slice(0, 6).map((album) => (
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
                    onCardClick={() => album.spotifyUrl && handleAlbumClick(album.spotifyUrl)}
                    onDownloadClick={(e) => {
                      e.stopPropagation();
                      if (album.spotifyUrl) handleDownloadAlbum(album.spotifyUrl);
                    }}
                    onArtistClick={handleArtistClick}
                  />
                ))}
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
