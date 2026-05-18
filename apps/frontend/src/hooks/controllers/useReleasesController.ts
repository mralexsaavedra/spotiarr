import type { ArtistRelease } from "@spotiarr/shared";
import { MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";
import { useReleasesQuery } from "../queries/useReleasesQuery";
import { useAlbumPreviewNavigation } from "../useAlbumPreviewNavigation";

export const useReleasesController = () => {
  const navigate = useNavigate();

  const { releases, isLoading, error } = useReleasesQuery();
  const createPlaylist = useCreatePlaylistMutation();
  const { navigateToAlbumPreview } = useAlbumPreviewNavigation();

  const handleReleaseClick = useCallback(
    (release: ArtistRelease) => {
      void navigateToAlbumPreview(release);
    },
    [navigateToAlbumPreview],
  );

  const handleDownloadRelease = useCallback(
    (e: MouseEvent, spotifyUrl: string) => {
      e.stopPropagation();
      createPlaylist.mutate({ kind: "spotifyUrl", spotifyUrl });
    },
    [createPlaylist],
  );

  const handleArtistClick = useCallback(
    (artistId: string) => {
      navigate(Path.ARTIST_DETAIL.replace(":id", artistId));
    },
    [navigate],
  );

  return {
    releases,
    isLoading,
    error,
    handleReleaseClick,
    handleDownloadRelease,
    handleArtistClick,
  };
};
