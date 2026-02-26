import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeSpotifyUrl } from "@/utils/spotify";
import { Path } from "../../routes/routes";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";

export const useHeaderController = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const createPlaylist = useCreatePlaylistMutation();

  const [url, setUrlState] = useState(() => {
    if (location.pathname === Path.SEARCH) {
      return searchParams.get("q") ?? "";
    }
    return "";
  });

  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(() => {
    return normalizeSpotifyUrl(url);
  });

  const debouncedUrl = useDebounce(url, 500);

  const setUrl = useCallback((value: string) => {
    setUrlState(value);
    setNormalizedUrl(normalizeSpotifyUrl(value));
  }, []);

  const urlRef = useRef(url);
  const normalizedUrlRef = useRef(normalizedUrl);

  useEffect(() => {
    urlRef.current = url;
    normalizedUrlRef.current = normalizedUrl;
  }, [url, normalizedUrl]);

  useEffect(() => {
    if (location.pathname === Path.SEARCH) {
      const q = searchParams.get("q") ?? "";
      if (q && q !== urlRef.current) {
        setUrl(q);
      }
    } else if (location.pathname !== Path.SEARCH && !normalizedUrlRef.current) {
      if (urlRef.current !== "") {
        setUrl("");
      }
    }
  }, [location.pathname, searchParams, setUrl]);

  const lastProcessedDebounce = useRef(debouncedUrl);

  useEffect(() => {
    if (debouncedUrl !== lastProcessedDebounce.current) {
      lastProcessedDebounce.current = debouncedUrl;

      if (debouncedUrl.trim() && !normalizedUrl) {
        const currentQ = searchParams.get("q") ?? "";
        if (debouncedUrl.trim() !== currentQ) {
          const isAlreadyInSearch = location.pathname === Path.SEARCH;
          navigate(`${Path.SEARCH}?q=${encodeURIComponent(debouncedUrl.trim())}`, {
            replace: isAlreadyInSearch,
          });
        }
      }
    }
  }, [debouncedUrl, normalizedUrl, location.pathname, searchParams, navigate]);

  const handleSubmit = useCallback(() => {
    if (normalizedUrl) {
      createPlaylist.mutate(normalizedUrl);
      setUrl("");
    } else if (url.trim()) {
      const isAlreadyInSearch = location.pathname === Path.SEARCH;
      navigate(`${Path.SEARCH}?q=${encodeURIComponent(url.trim())}`, {
        replace: isAlreadyInSearch,
      });
    }
  }, [createPlaylist, normalizedUrl, url, navigate, location.pathname, setUrl]);

  const isValidUrl = Boolean(normalizedUrl);

  const handleChangeUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setUrl(event.target.value);
    },
    [setUrl],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return {
    url,
    isPending: createPlaylist.isPending,
    isValidUrl,
    handleSubmit,
    handleChangeUrl,
    handleKeyUp,
  };
};
