import type { ArtistRelease } from "@spotiarr/shared";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { useReleasesQuery } from "../queries/useReleasesQuery";
import { useAlbumPreviewNavigation } from "../useAlbumPreviewNavigation";

export const useReleasesController = () => {
  const navigate = useNavigate();

  const { releases, isLoading, error } = useReleasesQuery();
  const { navigateToAlbumPreview } = useAlbumPreviewNavigation();

  const handleReleaseClick = useCallback(
    (release: ArtistRelease) => {
      void navigateToAlbumPreview(release);
    },
    [navigateToAlbumPreview],
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
    handleArtistClick,
  };
};
