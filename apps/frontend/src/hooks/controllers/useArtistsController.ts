import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";
import { Path } from "@/routes/routes";
import { useFollowedArtistsQuery } from "../queries/useFollowedArtistsQuery";
import { useDebounce } from "../useDebounce";

export const useArtistsController = () => {
  const navigate = useNavigate();
  const { artists, isLoading, error } = useFollowedArtistsQuery();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, APP_CONFIG.DEBOUNCE.DEFAULT_DELAY);

  const filteredArtists = useMemo(() => {
    const list = artists ?? [];
    const query = debouncedSearch.trim().toLowerCase();

    if (!query) {
      return list;
    }

    return list.filter((artist) => artist.name.toLowerCase().includes(query));
  }, [artists, debouncedSearch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleArtistClick = useCallback(
    (id: string) => {
      navigate(Path.ARTIST_DETAIL.replace(":id", id));
    },
    [navigate],
  );

  return {
    filteredArtists,
    isLoading,
    error,
    search,
    handleSearchChange,
    handleArtistClick,
  };
};
