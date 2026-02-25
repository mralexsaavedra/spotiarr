import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeSpotifyUrl } from "@/utils/spotify";
import { Path } from "../../routes/routes";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";

export const useHeaderController = () => {
  const [url, setUrlState] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
  const createPlaylist = useCreatePlaylistMutation();
  const navigate = useNavigate();

  const setUrl = useCallback((value: string) => {
    setUrlState(value);
    setNormalizedUrl(normalizeSpotifyUrl(value));
  }, []);

  const handleDownload = useCallback(() => {
    if (!normalizedUrl) {
      return;
    }

    createPlaylist.mutate(normalizedUrl);
    setUrl("");
  }, [createPlaylist, normalizedUrl, setUrl]);

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
        if (isValidUrl) {
          handleDownload();
        } else if (url.trim()) {
          navigate(`${Path.SEARCH}?q=${encodeURIComponent(url.trim())}`);
        }
      }
    },
    [handleDownload, isValidUrl, url, navigate],
  );

  return {
    url,
    isPending: createPlaylist.isPending,
    isValidUrl,
    handleDownload,
    handleChangeUrl,
    handleKeyUp,
  };
};
