import { MouseEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { useReleasesQuery } from "../queries/useReleasesQuery";

export const useReleasesController = () => {
  const navigate = useNavigate();

  const { releases, isLoading, error } = useReleasesQuery();
  const { data: playlists = [] } = usePlaylistsQuery();
  const createPlaylist = useCreatePlaylistMutation();

  const handleReleaseClick = useCallback(
    (release: { spotifyUrl?: string | null; albumId: string }) => {
      const existingPlaylist = playlists.find((p) => p.spotifyUrl === release.spotifyUrl);

      if (existingPlaylist) {
        navigate(`${Path.PLAYLIST_DETAIL.replace(":id", existingPlaylist.id)}`);
      } else if (release.spotifyUrl) {
        navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(release.spotifyUrl)}`);
      }
    },
    [playlists, navigate],
  );

  const handleDownloadRelease = useCallback(
    (e: MouseEvent, spotifyUrl: string) => {
      e.stopPropagation();
      createPlaylist.mutate(spotifyUrl);
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
