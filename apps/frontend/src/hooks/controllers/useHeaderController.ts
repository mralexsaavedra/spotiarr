import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { normalizeSpotifyUrl } from "@/utils/spotify";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";

export const useHeaderController = () => {
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

  const handleChangeUrl = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setUrl(event.target.value);
    },
    [setUrl],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && isValidUrl) {
        handleDownload();
      }
    },
    [handleDownload, isValidUrl],
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
