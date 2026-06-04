import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";
import { useMyPlaylistsQuery } from "@/hooks/queries/useMyPlaylistsQuery";
import { usePlaylistsQuery } from "@/hooks/queries/usePlaylistsQuery";
import { Path } from "@/routes/routes";
import { useDebounce } from "../useDebounce";

export const useMyPlaylistsController = () => {
  const { data: playlists = [], isLoading, error } = useMyPlaylistsQuery();
  const { data: savedPlaylists = [] } = usePlaylistsQuery();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, APP_CONFIG.DEBOUNCE.SEARCH_DELAY);
  const navigate = useNavigate();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handlePlaylistClick = useCallback(
    (id: string) => {
      const playlist = playlists.find((p) => p.id === id);
      if (playlist) {
        const savedPlaylist = savedPlaylists.find((p) => p.spotifyUrl === playlist.spotifyUrl);

        if (savedPlaylist) {
          navigate(Path.PLAYLIST_DETAIL.replace(":id", savedPlaylist.id));
          return;
        }

        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(playlist.spotifyUrl)}`);
      }
    },
    [navigate, playlists, savedPlaylists],
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
