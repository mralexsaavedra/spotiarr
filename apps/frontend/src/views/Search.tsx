import { ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";
import React, { FC, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Image } from "@/components/atoms/Image";
import { Loading } from "@/components/atoms/Loading";
import { useCreatePlaylistMutation } from "@/hooks/mutations/useCreatePlaylistMutation";
import { useSearchQuery } from "@/hooks/queries/useSearchQuery";
import { Path } from "@/routes/routes";

type FilterTab = "all" | "tracks" | "albums" | "artists";

// ─── Helper ────────────────────────────────────────────────────────────────────
const formatDuration = (ms?: number): string => {
  if (!ms) return "";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ─── Top result card ────────────────────────────────────────────────────────────
const TopResultCard: FC<{
  artist: FollowedArtist;
  onClick: (id: string) => void;
}> = ({ artist, onClick }) => {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => onClick(artist.id)}
      className="group flex min-h-[180px] cursor-pointer flex-col justify-end gap-4 overflow-hidden rounded-xl bg-white/5 p-5 transition-colors hover:bg-white/10"
    >
      <div className="relative h-24 w-24 overflow-hidden rounded-full bg-zinc-800 shadow-2xl">
        <Image
          src={artist.image ?? undefined}
          alt={artist.name}
          fallbackIcon="user"
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div>
        <h2 className="mb-1 text-3xl font-extrabold text-white">{artist.name}</h2>
        <span className="inline-block rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold tracking-wider text-zinc-300 uppercase">
          {t("artist.type")}
        </span>
      </div>
    </div>
  );
};

// ─── Compact track row ──────────────────────────────────────────────────────────
const TrackRow: FC<{
  track: NormalizedTrack;
  index: number;
  onDownload: (track: NormalizedTrack) => void;
}> = ({ track, index, onDownload }) => (
  <div
    onClick={() => onDownload(track)}
    className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-white/5"
  >
    <span className="w-5 shrink-0 text-right text-sm text-zinc-500 group-hover:hidden">
      {index + 1}
    </span>
    <span className="hidden w-5 shrink-0 group-hover:block">
      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-800">
      <Image src={track.albumCoverUrl ?? undefined} alt={track.name} fallbackIcon="music" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold text-white">{track.name}</p>
      <p className="truncate text-xs text-zinc-400">{track.artist}</p>
    </div>
    <span className="shrink-0 text-sm text-zinc-500">{formatDuration(track.durationMs)}</span>
  </div>
);

const ArtistCircle: FC<{
  artist: FollowedArtist;
  onClick: (id: string) => void;
}> = ({ artist, onClick }) => {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => onClick(artist.id)}
      className="group flex cursor-pointer flex-col items-center gap-2 rounded-lg p-3 transition-colors hover:bg-white/5"
    >
      <div className="relative aspect-square w-full max-w-40 overflow-hidden rounded-full bg-zinc-800 shadow-lg">
        <Image
          src={artist.image ?? undefined}
          alt={artist.name}
          fallbackIcon="user"
          className="transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="w-full text-center">
        <p className="truncate text-sm font-semibold text-white">{artist.name}</p>
        <p className="text-xs text-zinc-400">{t("artist.type")}</p>
      </div>
    </div>
  );
};

const AlbumCard: FC<{
  album: ArtistRelease;
  onClick: (album: ArtistRelease) => void;
  onDownload: (e: React.MouseEvent, url: string) => void;
}> = ({ album, onClick, onDownload }) => (
  <div
    onClick={() => onClick(album)}
    className="group flex cursor-pointer flex-col gap-2 rounded-lg p-3 transition-colors hover:bg-white/5"
  >
    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-800 shadow-lg">
      <Image src={album.coverUrl ?? undefined} alt={album.albumName} fallbackIcon="music" />
      {album.spotifyUrl && (
        <button
          onClick={(e) => onDownload(e, album.spotifyUrl!)}
          className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-green-500 opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 hover:scale-110 hover:bg-green-400"
          title="Download"
        >
          <svg className="h-4 w-4 text-black" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
    <div>
      <p className="truncate text-sm font-semibold text-white">{album.albumName}</p>
      <p className="truncate text-xs text-zinc-400">
        {album.releaseDate?.slice(0, 4)}
        {album.releaseDate && album.artistName ? " · " : ""}
        {album.artistName}
      </p>
    </div>
  </div>
);

// ─── Responsive Grid Section ──────────────────────────────────────────────────
const GridSection: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="w-full min-w-0">
    <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {children}
    </div>
  </section>
);

// ─── Filter tabs ─────────────────────────────────────────────────────────────────
const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "tracks", label: "Canciones" },
  { key: "artists", label: "Artistas" },
  { key: "albums", label: "Álbumes" },
];

// ─── Main view ──────────────────────────────────────────────────────────────────
export const Search: FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const navigate = useNavigate();
  const createPlaylist = useCreatePlaylistMutation();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const typesMap: Record<FilterTab, string[]> = {
    all: ["track", "album", "artist"],
    tracks: ["track"],
    albums: ["album"],
    artists: ["artist"],
  };

  const { data: results, isLoading } = useSearchQuery(query, typesMap[activeTab], 20);

  const handleDownloadTrack = useCallback(
    (track: NormalizedTrack) => {
      if (track.trackUrl) createPlaylist.mutate(track.trackUrl);
    },
    [createPlaylist],
  );

  const handleAlbumClick = useCallback(
    (album: ArtistRelease) => {
      if (album.spotifyUrl) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(album.spotifyUrl)}`);
      }
    },
    [navigate],
  );

  const handleDownloadAlbum = useCallback(
    (e: React.MouseEvent, spotifyUrl: string) => {
      e.stopPropagation();
      createPlaylist.mutate(spotifyUrl);
    },
    [createPlaylist],
  );

  const handleArtistClick = useCallback(
    (artistId: string) => navigate(Path.ARTIST_DETAIL.replace(":id", artistId)),
    [navigate],
  );

  const topResult = results?.artists?.[0] ?? null;
  const topTracks = results?.tracks?.slice(0, 4) ?? [];
  const hasResults =
    (results?.tracks?.length ?? 0) > 0 ||
    (results?.albums?.length ?? 0) > 0 ||
    (results?.artists?.length ?? 0) > 0;

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
                    <TopResultCard artist={topResult} onClick={handleArtistClick} />
                  </div>
                )}

                {/* Top tracks — always shown */}
                {topTracks.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">{t("search.tracks")}</h2>
                    <div className="flex flex-col">
                      {topTracks.map((track, i) => (
                        <TrackRow
                          key={track.spotifyUrl ?? i}
                          track={track}
                          index={i}
                          onDownload={handleDownloadTrack}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Artists section ─────────────────────────────────────────── */}
            {(activeTab === "all" || activeTab === "artists") &&
              (results?.artists?.length ?? 0) > 0 && (
                <GridSection title={t("search.artists")}>
                  {(activeTab === "all" ? results!.artists.slice(0, 6) : results!.artists).map(
                    (artist) => (
                      <ArtistCircle key={artist.id} artist={artist} onClick={handleArtistClick} />
                    ),
                  )}
                </GridSection>
              )}

            {/* ── Full track list (tracks tab only) ───────────────────────── */}
            {activeTab === "tracks" && (results?.tracks?.length ?? 0) > 0 && (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-white">{t("search.tracks")}</h2>
                <div className="flex flex-col">
                  {results!.tracks.map((track, i) => (
                    <TrackRow
                      key={track.spotifyUrl ?? i}
                      track={track}
                      index={i}
                      onDownload={handleDownloadTrack}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Albums section ──────────────────────────────────────────── */}
            {(activeTab === "all" || activeTab === "albums") &&
              (results?.albums?.length ?? 0) > 0 && (
                <GridSection title={t("search.albums")}>
                  {(activeTab === "all" ? results!.albums.slice(0, 6) : results!.albums).map(
                    (album) => (
                      <AlbumCard
                        key={album.albumId}
                        album={album}
                        onClick={handleAlbumClick}
                        onDownload={handleDownloadAlbum}
                      />
                    ),
                  )}
                </GridSection>
              )}
          </>
        )}
      </div>
    </section>
  );
};
