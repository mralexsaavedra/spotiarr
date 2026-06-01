import type { ArtistRelease } from "@spotiarr/shared";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { usePlaylistsQuery } from "./queries/usePlaylistsQuery";

export const useAlbumPreviewNavigation = () => {
  const navigate = useNavigate();
  const { data: playlists = [] } = usePlaylistsQuery();

  const navigateToAlbumPreview = (album: ArtistRelease) => {
    // If the album is already a downloaded playlist, jump to its detail view.
    if (album.spotifyUrl) {
      const existingPlaylist = playlists.find((p) => p.spotifyUrl === album.spotifyUrl);
      if (existingPlaylist) {
        navigate(Path.PLAYLIST_DETAIL.replace(":id", existingPlaylist.id));
        return;
      }
    }

    // Always resolve through AlbumDetail (Deezer-first cascade) so Spotify
    // rate-limit storms don't block album browsing.
    navigate(
      Path.ALBUM_DETAIL.replace(":artistId", album.artistId).replace(":albumId", album.albumId),
    );
  };

  return { navigateToAlbumPreview };
};
