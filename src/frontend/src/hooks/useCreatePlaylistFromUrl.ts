import { useCallback, useState } from "react";
import { normalizeSpotifyUrl } from "../utils/spotify";
import { useCreatePlaylistMutation } from "./mutations/useCreatePlaylistMutation";

export const useCreatePlaylistFromUrl = () => {
  const [url, setUrlState] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
  const createPlaylist = useCreatePlaylistMutation();

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

  return {
    url,
    setUrl,
    handleDownload,
    isPending: createPlaylist.isPending,
    isValidUrl,
  };
};
