import { NormalizedTrack, isDeezerUrl, extractDeezerTrackId } from "@spotiarr/shared";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TopResultItem } from "@/components/molecules/SearchTopResultCard";
import { useBulkPlaylistStatus } from "@/contexts/DownloadStatusContext";
import { useToast } from "@/contexts/ToastContext";
import { useCreatePlaylistMutation } from "@/hooks/mutations/useCreatePlaylistMutation";
import { useSearchQuery } from "@/hooks/queries/useSearchQuery";
import { Path } from "@/routes/routes";
import { isSpotifyUrl } from "@/utils/spotify";

export type FilterTab = "all" | "tracks" | "albums" | "artists";

export const SEARCH_TABS: { key: FilterTab; labelKey: string }[] = [
  { key: "all", labelKey: "cards.albumTypes.all" },
  { key: "tracks", labelKey: "tracks" },
  { key: "artists", labelKey: "artists" },
  { key: "albums", labelKey: "albums" },
];

const TYPES: Record<FilterTab, string[]> = {
  all: ["track", "album", "artist"],
  tracks: ["track"],
  albums: ["album"],
  artists: ["artist"],
};

export const useSearchController = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const navigate = useNavigate();
  const createPlaylist = useCreatePlaylistMutation();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const { data: results, isLoading } = useSearchQuery(query, TYPES[activeTab], 20);

  const hasResults =
    (results?.tracks?.length ?? 0) > 0 ||
    (results?.albums?.length ?? 0) > 0 ||
    (results?.artists?.length ?? 0) > 0;

  const handleDownloadTrack = useCallback(
    (track: NormalizedTrack) => {
      if (isDeezerUrl(track.trackUrl) && track.albumId) {
        const deezerTrackId = extractDeezerTrackId(track.trackUrl!);
        if (deezerTrackId) {
          createPlaylist.mutate({
            kind: "deezerTrack",
            deezerTrackId,
            deezerAlbumId: track.albumId,
          });
          return;
        }
      }
      if (isSpotifyUrl(track.trackUrl)) {
        createPlaylist.mutate({ kind: "spotifyUrl", spotifyUrl: track.trackUrl! });
      } else if (track.albumId) {
        createPlaylist.mutate({
          kind: "album",
          artistId: track.primaryArtist ?? "",
          albumId: track.albumId,
        });
      } else {
        toast.error("Track cannot be downloaded");
      }
    },
    [createPlaylist, toast],
  );

  const handleAlbumClick = useCallback(
    (album: { spotifyUrl?: string; artistId: string; albumId: string }) => {
      if (album.spotifyUrl && isSpotifyUrl(album.spotifyUrl)) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(album.spotifyUrl)}`);
      } else {
        navigate(
          Path.ALBUM_DETAIL.replace(":artistId", album.artistId).replace(":albumId", album.albumId),
        );
      }
    },
    [navigate],
  );

  const handleDownloadAlbum = useCallback(
    (album: { spotifyUrl?: string; artistId: string; albumId: string }) => {
      if (album.spotifyUrl && isSpotifyUrl(album.spotifyUrl)) {
        createPlaylist.mutate({ kind: "spotifyUrl", spotifyUrl: album.spotifyUrl });
      } else if (album.artistId && album.albumId) {
        createPlaylist.mutate({
          kind: "album",
          artistId: album.artistId,
          albumId: album.albumId,
        });
      }
    },
    [createPlaylist],
  );

  const handleArtistClick = useCallback(
    (artistId: string) => navigate(Path.ARTIST_DETAIL.replace(":id", artistId)),
    [navigate],
  );

  const handleTopResultClick = useCallback(
    (item: TopResultItem) => {
      if (item.type === "artist") {
        navigate(Path.ARTIST_DETAIL.replace(":id", item.data.id));
      } else if (item.type === "track") {
        if (item.data.trackUrl && isSpotifyUrl(item.data.trackUrl)) {
          navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(item.data.trackUrl)}`);
        } else if (item.data.primaryArtist && item.data.albumId) {
          navigate(
            Path.ALBUM_DETAIL.replace(":artistId", item.data.primaryArtist).replace(
              ":albumId",
              item.data.albumId,
            ),
          );
        }
      } else if (item.type === "album") {
        if (item.data.spotifyUrl && isSpotifyUrl(item.data.spotifyUrl)) {
          navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(item.data.spotifyUrl)}`);
        } else {
          navigate(
            Path.ALBUM_DETAIL.replace(":artistId", item.data.artistId).replace(
              ":albumId",
              item.data.albumId,
            ),
          );
        }
      }
    },
    [navigate],
  );

  const topTracks = useMemo(() => results?.tracks?.slice(0, 4) ?? [], [results?.tracks]);

  const topResult = useMemo<TopResultItem | null>(() => {
    if (!results) return null;
    const queryLower = query.toLowerCase();

    const topArtist = results.artists?.[0];
    const topAlbum = results.albums?.[0];
    const topTrack = results.tracks?.[0];

    if (topTrack?.name.toLowerCase() === queryLower) return { type: "track", data: topTrack };
    if (topArtist?.name.toLowerCase() === queryLower) return { type: "artist", data: topArtist };
    if (topAlbum?.albumName.toLowerCase() === queryLower) return { type: "album", data: topAlbum };

    if (topTrack?.name.toLowerCase().startsWith(queryLower))
      return { type: "track", data: topTrack };
    if (topArtist?.name.toLowerCase().startsWith(queryLower))
      return { type: "artist", data: topArtist };
    if (topAlbum?.albumName.toLowerCase().startsWith(queryLower))
      return { type: "album", data: topAlbum };

    if (topArtist) return { type: "artist", data: topArtist };
    if (topTrack) return { type: "track", data: topTrack };
    if (topAlbum) return { type: "album", data: topAlbum };

    return null;
  }, [results, query]);

  const topAlbums = useMemo(() => results?.albums?.slice(0, 6) ?? [], [results?.albums]);

  const topAlbumStatusItems = useMemo(
    () =>
      topAlbums.map((album) => ({
        url: album.spotifyUrl,
        totalTracks: album.totalTracks,
      })),
    [topAlbums],
  );

  const topAlbumsStatusMap = useBulkPlaylistStatus(topAlbumStatusItems);

  return {
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
  };
};
