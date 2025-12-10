import { SpotifyPlaylist } from "@spotiarr/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";
import { Path } from "@/routes/routes";
import { playlistService } from "@/services/playlist.service";
import { useDebounce } from "../useDebounce";

export const useMyPlaylistsController = () => {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, APP_CONFIG.DEBOUNCE.SEARCH_DELAY);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setIsLoading(true);
        const data = await playlistService.getMyPlaylists();
        setPlaylists(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handlePlaylistClick = useCallback(
    (id: string) => {
      const playlist = playlists.find((p) => p.id === id);
      if (playlist) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(playlist.spotifyUrl)}`);
      }
    },
    [navigate, playlists],
  );

  const filteredPlaylists = useMemo(
    () =>
      playlists.filter((playlist) =>
        playlist.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [playlists, debouncedSearch],
  );

  return {
    filteredPlaylists,
    isLoading,
    error,
    search,
    handleSearchChange,
    handlePlaylistClick,
  };
};
